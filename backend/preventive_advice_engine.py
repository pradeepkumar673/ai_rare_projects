"""
Preventive Advice Engine — Smart Suggestions Module
======================================================
Integrates with the Rare Disease Diagnostic Engine backend.

Usage (in routes/diagnosis.py):
    from preventive_advice_engine import PreventiveAdviceEngine
    engine = PreventiveAdviceEngine()
    advice = engine.get_advice(disease_name, demographics)

The `advice` dict is injected into the /api/diagnosis/predict response
under the key `preventive_advice`.
"""

from typing import Dict, List, Optional, Any


# ---------------------------------------------------------------------------
# Regional UV / environmental risk map (India-specific + global)
# ---------------------------------------------------------------------------
HIGH_UV_REGIONS = {
    "india", "rajasthan", "gujarat", "maharashtra", "andhra pradesh",
    "telangana", "karnataka", "tamil nadu", "kerala", "goa",
    "australia", "south africa", "brazil", "mexico", "uae",
    "saudi arabia", "pakistan", "sri lanka", "bangladesh",
}

HIGH_POLLUTION_REGIONS = {
    "delhi", "mumbai", "kolkata", "lucknow", "kanpur", "patna",
    "beijing", "lahore", "dhaka", "karachi",
}

HIGH_COPPER_WATER_REGIONS = {
    "india", "pakistan", "bangladesh",
}


# ---------------------------------------------------------------------------
# Skin type lookup
# ---------------------------------------------------------------------------
SKIN_TYPE_ADVICE = {
    "type_i":   "Very fair — extreme UV sensitivity. SPF 100 mandatory outdoors.",
    "type_ii":  "Fair — burns easily. Use SPF 50+ and reapply every 90 minutes.",
    "type_iii": "Medium — tans after burning. SPF 30–50 daily recommended.",
    "type_iv":  "Olive — tans easily. SPF 30 daily; inspect moles regularly.",
    "type_v":   "Brown — rarely burns. SPF 15–30; monitor for hyperpigmentation changes.",
    "type_vi":  "Dark — very rarely burns. Annual skin exam; watch for amelanotic lesions.",
}


# ---------------------------------------------------------------------------
# Master disease advice database
# ---------------------------------------------------------------------------
DISEASE_ADVICE: Dict[str, Dict[str, Any]] = {

    # ── SKIN / DERMATOLOGICAL ────────────────────────────────────────────────
    "Melanoma": {
        "category": "Skin Cancer",
        "base_tips": [
            "Avoid direct sun exposure between 10 AM and 4 PM.",
            "Apply SPF 50+ broad-spectrum sunscreen daily, reapply every 2 hours.",
            "Never use tanning beds or UV lamps — they increase melanoma risk 75%.",
            "Perform monthly self-skin checks using the ABCDE rule (Asymmetry, Border, Colour, Diameter, Evolution).",
            "See a dermatologist for a full-body skin exam every 6 months.",
            "Wear UV-protective clothing (UPF 50+), wide-brimmed hats, and UV-blocking sunglasses.",
            "Avoid sunburn — a single blistering sunburn doubles lifetime melanoma risk.",
            "Keep a photo diary of moles to track any changes over time.",
        ],
        "age_modifiers": {
            "child":  ["Parents: apply SPF 30+ on children before outdoor play; limit midday sun."],
            "teen":   ["Educate about tanning dangers; school-age sunburns are a major risk factor."],
            "adult":  ["Annual dermatology screening; consider full-body dermoscopy."],
            "senior": ["Cumulative UV damage is highest — bi-annual skin checks mandatory.", "Check scalp, ears, and nail beds often missed during self-exams."],
        },
        "region_modifiers": {
            "high_uv": ["India/tropical region detected: UV Index regularly 8–11+. Use SPF 100 outdoors and avoid outdoor work during peak UV hours.", "Install UV-filtering window film at home and in vehicles."],
        },
        "dietary": [
            "Increase antioxidant intake: tomatoes, green tea, carrots, and leafy greens.",
            "Vitamin D supplementation may be needed if sun exposure is avoided; consult your doctor.",
        ],
        "emergency_signs": ["Rapidly growing dark lesion", "Bleeding mole", "New satellite lesions around existing mole"],
    },

    "Basal Cell Carcinoma": {
        "category": "Skin Cancer",
        "base_tips": [
            "Avoid UV exposure — BCC is almost entirely UV-driven.",
            "Use SPF 30–50 sunscreen daily, even on cloudy days.",
            "Schedule early biopsy of any pearly, waxy, or translucent skin lesion.",
            "Wear protective clothing and hats during outdoor activities.",
            "Do not ignore slow-growing sores that don't heal — classic BCC presentation.",
            "Avoid exposure to arsenic (well water in some rural areas) — a secondary risk factor.",
            "Annual dermatology review with dermoscopy.",
        ],
        "age_modifiers": {
            "senior": ["Risk peaks after age 50 — 6-monthly dermatology checks recommended.", "Inspect face, neck, ears, and scalp — most common BCC sites."],
            "adult":  ["Examine any fair-skinned areas with history of childhood sunburn."],
        },
        "region_modifiers": {
            "high_uv": ["High UV region: daily SPF application is non-negotiable.", "Seek shade when outdoors and use UV-blocking car window tints."],
        },
        "dietary": [
            "Eat foods rich in carotenoids (sweet potato, spinach, papaya).",
            "Stay well hydrated to support skin barrier function.",
        ],
        "emergency_signs": ["Non-healing ulcer on face/neck", "Visible blood vessels around a lesion"],
    },

    "Squamous Cell Carcinoma (SCC)": {
        "category": "Skin Cancer",
        "base_tips": [
            "Treat actinic keratoses (precancerous lesions) promptly — they can progress to SCC.",
            "Avoid chronic UV exposure and use SPF 30+ daily.",
            "Do not smoke — HPV infection combined with smoking dramatically increases oral SCC risk.",
            "Inspect lips, mouth, and tongue for white/red patches monthly.",
            "Protect skin during outdoor occupational exposure (construction, farming).",
            "Immunocompromised patients (organ transplants) are at higher SCC risk — more frequent skin checks.",
        ],
        "age_modifiers": {
            "senior": ["Cumulative sun damage makes seniors highest-risk — 3-monthly skin reviews."],
        },
        "region_modifiers": {
            "high_uv": ["Tropical/high-UV region: occupational sun protection (hats, long sleeves, SPF) is critical."],
        },
        "dietary": ["Limit alcohol; excessive intake increases risk of oral SCC."],
        "emergency_signs": ["Rapidly enlarging scaly lesion", "Tender or bleeding skin growth"],
    },

    # ── NEUROLOGICAL ────────────────────────────────────────────────────────
    "Wilson Disease": {
        "category": "Metabolic/Copper Metabolism",
        "base_tips": [
            "Avoid copper-rich foods: shellfish (especially oysters), organ meats (liver), mushrooms, nuts, and chocolate.",
            "Do not use copper cookware or copper water pipes — switch to stainless steel or glass.",
            "Take copper-chelating medications (penicillamine or trientine) consistently as prescribed.",
            "Avoid alcohol completely — it accelerates liver damage.",
            "Have liver function tests every 3–6 months.",
            "Wear a medical alert bracelet indicating Wilson Disease.",
            "Inform all treating doctors — many medications affect copper metabolism.",
            "Psychiatric symptoms (mood changes, psychosis) can be Wilson-related — do not attribute to stress alone.",
        ],
        "age_modifiers": {
            "child":  ["Genetic family screening for siblings — Wilson Disease is autosomal recessive.", "Dietary copper restriction is more critical in children."],
            "teen":   ["School-age onset is common — coordinate with school nurse about medications and dietary needs."],
            "adult":  ["Kayser-Fleischer rings in eyes — have ophthalmologist check regularly."],
        },
        "region_modifiers": {
            "high_copper_water": ["India: test household water for copper contamination, especially from old plumbing."],
        },
        "dietary": [
            "Limit: shellfish, liver, nuts, chocolate, mushrooms, legumes.",
            "Zinc supplements (with doctor approval) can reduce intestinal copper absorption.",
            "Drink filtered/bottled water if copper pipes are present in your home.",
        ],
        "emergency_signs": ["Acute liver failure", "Sudden psychiatric deterioration", "Hemolytic anemia crisis"],
    },

    "Huntington Disease": {
        "category": "Neurological/Genetic",
        "base_tips": [
            "Regular physiotherapy to maintain motor function and delay decline.",
            "Speech therapy early — dysphagia and dysarthria appear progressively.",
            "Maintain a structured daily routine — cognitive predictability reduces agitation.",
            "Ensure home safety: remove tripping hazards, install grab bars, use non-slip mats.",
            "Genetic counselling for all first-degree family members — 50% inheritance risk.",
            "Mental health support (therapist + support group) for both patient and caregivers.",
            "Maintain caloric intake — HD patients often burn calories rapidly due to chorea.",
            "Occupational therapy to preserve independence in daily activities.",
        ],
        "age_modifiers": {
            "adult":  ["Most HD symptoms appear age 30–50 — proactive career and financial planning recommended."],
            "senior": ["Falls risk is very high — assisted living evaluation may be needed."],
        },
        "dietary": [
            "High-calorie, high-protein diet to counter weight loss from involuntary movements.",
            "Soft/thickened foods when swallowing becomes difficult.",
            "Consult a registered dietitian specialising in neurological conditions.",
        ],
        "emergency_signs": ["Inability to swallow safely (aspiration risk)", "Severe psychiatric crisis", "Repeated falls"],
    },

    "Amyotrophic Lateral Sclerosis (ALS)": {
        "category": "Neurological/Motor Neuron",
        "base_tips": [
            "Begin respiratory monitoring (spirometry) immediately — respiratory failure is the leading cause of death.",
            "Physiotherapy to maintain muscle strength and prevent contractures.",
            "Speech-language pathology early — augmentative communication devices should be planned proactively.",
            "Nutritional support: dysphagia develops early; soft diet, then PEG tube when needed.",
            "Avoid activities with high fall risk — muscle weakness makes fractures dangerous.",
            "Connect with an ALS multidisciplinary team (neurologist, physio, respiratory therapist, dietitian, social worker).",
            "Discuss advance care planning and ventilatory support options early.",
            "Consider riluzole therapy as soon as diagnosed — it modestly extends survival.",
        ],
        "age_modifiers": {
            "adult":  ["Most ALS onset is age 40–70 — legal and financial planning should begin immediately after diagnosis."],
        },
        "dietary": [
            "High-calorie diet to prevent weight loss which accelerates decline.",
            "Avoid thin liquids if choking is present; thickened fluids recommended.",
            "Regular nutritional assessment every 3 months.",
        ],
        "emergency_signs": ["Forced vital capacity below 50%", "Choking episodes", "Inability to speak"],
    },

    "Friedreich Ataxia": {
        "category": "Neurological/Genetic",
        "base_tips": [
            "Physiotherapy twice weekly to maintain gait and balance.",
            "Cardiac monitoring every 6 months — hypertrophic cardiomyopathy is common and serious.",
            "Diabetes screening annually — frataxin deficiency affects pancreatic function.",
            "Use ankle-foot orthoses (AFOs) to support foot deformity and improve walking.",
            "Scoliosis monitoring — spinal bracing or surgery may be needed.",
            "Avoid driving if coordination impairment affects safety.",
            "Occupational therapy for adaptive equipment (grips, rails, wheelchair).",
            "Genetic counselling for siblings — autosomal recessive, 25% sibling risk.",
        ],
        "dietary": [
            "Consider idebenone supplementation (under doctor supervision) — mitochondrial support.",
            "Antioxidant-rich diet (berries, leafy greens, nuts) may provide modest benefit.",
        ],
        "emergency_signs": ["Acute cardiac arrhythmia", "Syncope", "Severe scoliosis causing breathing difficulty"],
    },

    "Stiff Person Syndrome": {
        "category": "Autoimmune/Neurological",
        "base_tips": [
            "Avoid sudden loud noises and unexpected physical contact — they trigger severe spasms.",
            "Stress management is essential — psychological stress dramatically worsens stiffness.",
            "Work with a physiotherapist experienced in SPS — incorrect exercises can trigger spasms.",
            "Home modifications: remove tripping hazards; stiffness makes falls very dangerous.",
            "Wear a medical alert bracelet — emergency responders must know sedatives/muscle relaxants are needed.",
            "Take GABA-enhancing medications (diazepam, baclofen) consistently as prescribed.",
            "Avoid abrupt medication discontinuation — withdrawal triggers severe spasm crises.",
        ],
        "dietary": [
            "Gluten-free diet may benefit SPS patients with concurrent celiac antibodies (discuss with doctor).",
            "Magnesium-rich foods (spinach, pumpkin seeds) may support muscle relaxation.",
        ],
        "emergency_signs": ["Laryngospasm", "Respiratory compromise during spasm", "Prolonged spasm unresponsive to diazepam"],
    },

    "Tuberous Sclerosis Complex": {
        "category": "Neurological/Genetic",
        "base_tips": [
            "Annual brain MRI to monitor growth of subependymal giant cell astrocytomas (SEGAs).",
            "Renal ultrasound or MRI every 1–3 years — angiomyolipomas can haemorrhage.",
            "Seizure management: maintain antiepileptic medications consistently; keep seizure diary.",
            "Annual pulmonary function tests for females — LAM (lymphangioleiomyomatosis) risk.",
            "Skin lesion monitoring — facial angiofibromas can be treated with topical rapamycin.",
            "Cardiac echocardiography in infants — rhabdomyomas often regress spontaneously.",
            "Ophthalmology review annually for retinal hamartomas.",
            "mTOR inhibitors (everolimus/sirolimus) are first-line for SEGA and renal AML.",
        ],
        "age_modifiers": {
            "child":  ["Early intervention for developmental delays — educational support and cognitive therapy.", "Infantile spasms (hypsarrhythmia) require immediate treatment."],
            "adult":  ["Family planning counselling — 50% transmission risk per pregnancy."],
        },
        "emergency_signs": ["Status epilepticus", "Sudden flank pain (renal haemorrhage)", "Acute respiratory failure in females"],
    },

    "Neurofibromatosis Type 1": {
        "category": "Neurological/Genetic",
        "base_tips": [
            "Annual full-body examination for new neurofibromas and café-au-lait spots.",
            "MRI brain/spine if headaches, vision changes, or new neurological symptoms develop.",
            "Eye exam annually — Lisch nodules are diagnostic; optic glioma monitoring is critical.",
            "Blood pressure monitoring — NF1 causes renovascular hypertension.",
            "Scoliosis surveillance with X-ray in children every 6–12 months.",
            "Psychoeducational assessment in children — learning disabilities affect 50–70% of NF1 patients.",
            "Genetic counselling — autosomal dominant, 50% child inheritance risk.",
            "Avoid unnecessary radiation — NF1 patients have increased radiosensitivity.",
        ],
        "age_modifiers": {
            "child":  ["Early school support for learning difficulties is critical.", "Monitor for plexiform neurofibromas which can become malignant."],
            "adult":  ["Monitor for malignant peripheral nerve sheath tumors (MPNSTs) — report rapid tumor growth immediately."],
        },
        "emergency_signs": ["Rapidly enlarging painful neurofibroma", "New focal neurological deficit", "Sudden vision loss"],
    },

    # ── METABOLIC / LYSOSOMAL ───────────────────────────────────────────────
    "Fabry Disease": {
        "category": "Metabolic/Lysosomal Storage",
        "base_tips": [
            "Enzyme replacement therapy (ERT with agalsidase alfa/beta) — begin as early as possible.",
            "Avoid temperature extremes — heat, cold, and fever trigger neuropathic pain crises.",
            "Avoid strenuous exercise that induces pain episodes.",
            "Renal monitoring every 6 months — proteinuria and GFR tracking.",
            "Cardiac MRI every 1–2 years — cardiomyopathy is a major cause of mortality.",
            "Stroke prevention: ACE inhibitors, blood thinners if cardiac involvement.",
            "Avoid dehydration — it worsens kidney damage.",
            "Pain management plan with neurologist for acroparesthesias (burning in hands and feet).",
            "Genetic family screening — X-linked, females can be symptomatic carriers.",
        ],
        "age_modifiers": {
            "child":  ["Paediatric ERT initiation — earlier treatment reduces long-term organ damage."],
            "adult":  ["Assess for white matter lesions on brain MRI — cerebrovascular risk is high."],
        },
        "region_modifiers": {
            "high_uv": ["Avoid midday heat in tropical countries — heat worsens Fabry pain crises significantly."],
        },
        "dietary": [
            "Stay well hydrated (2–3 litres of water daily) to protect kidneys.",
            "Low-sodium diet to reduce blood pressure strain on damaged kidneys.",
            "Avoid high-glycemic foods if renal function is impaired.",
        ],
        "emergency_signs": ["Stroke symptoms (facial droop, arm weakness, speech loss)", "Hypertensive emergency", "Severe chest pain"],
    },

    "Gaucher Disease": {
        "category": "Metabolic/Lysosomal Storage",
        "base_tips": [
            "Enzyme replacement therapy (imiglucerase/velaglucerase) on prescribed schedule — do not miss infusions.",
            "Avoid contact sports — splenomegaly increases risk of life-threatening splenic rupture.",
            "Bone density DEXA scan every 1–2 years — Gaucher causes severe osteoporosis.",
            "Avoid prolonged immobility — increases bone infarction risk (avascular necrosis).",
            "Haematology monitoring every 6 months — thrombocytopenia and anaemia.",
            "Liver ultrasound annually — hepatomegaly monitoring.",
            "For Type 2/3 (neuronopathic): neurological evaluation every 6 months.",
            "Physical therapy to maintain bone strength without fracture risk.",
        ],
        "dietary": [
            "Calcium and Vitamin D supplementation to support bone health.",
            "High-protein diet to support blood cell production.",
            "Avoid alcohol — worsens liver involvement.",
        ],
        "emergency_signs": ["Sudden severe abdominal pain (possible splenic rupture)", "Bone crisis with severe pain and fever", "Severe thrombocytopenia with bleeding"],
    },

    "Pompe Disease": {
        "category": "Metabolic/Lysosomal Storage",
        "base_tips": [
            "Enzyme replacement therapy (alglucosidase alfa) — critical for disease modification.",
            "Respiratory therapy: incentive spirometry, chest physiotherapy, consider NIV (BiPAP) proactively.",
            "Avoid respiratory infections — immunisation against flu and pneumococcus annually.",
            "Physical therapy focused on strength and respiratory muscle support.",
            "Avoid prolonged fasting before procedures — metabolic stress worsens Pompe.",
            "Echocardiography in infants with classic Pompe — cardiac involvement can be severe.",
            "Hearing aids if sensorineural hearing loss develops.",
            "Nutritional support — macroglossia and swallowing difficulties impair intake.",
        ],
        "age_modifiers": {
            "child":  ["Classic infantile-onset: ERT must begin within weeks of diagnosis.", "Cardiac involvement is most severe in infants — immediate echo."],
            "adult":  ["Late-onset: respiratory failure often precedes limb weakness — spirometry every 6 months."],
        },
        "dietary": [
            "High-protein diet supports muscle preservation.",
            "Avoid simple sugars — glycogen accumulation worsens with high glucose load.",
        ],
        "emergency_signs": ["Respiratory failure", "Aspiration pneumonia", "Cardiomyopathy with acute decompensation (infantile)"],
    },

    "Tay-Sachs Disease": {
        "category": "Metabolic/Lysosomal Storage",
        "base_tips": [
            "No disease-modifying treatment exists — supportive care is paramount.",
            "Anti-seizure medications as prescribed; keep seizure diary.",
            "Feeding support: nasogastric or gastrostomy tube when swallowing becomes unsafe.",
            "Auditory and visual stimulation therapy to maintain engagement.",
            "Palliative care team involvement early for comfort-focused planning.",
            "Genetic counselling for all family members — carrier testing available.",
            "Physical therapy to manage tone and prevent contractures.",
            "Emotional support services for families — connect with Tay-Sachs foundations.",
        ],
        "emergency_signs": ["Status epilepticus", "Aspiration", "Acute respiratory compromise"],
    },

    "Niemann-Pick Disease": {
        "category": "Metabolic/Lysosomal Storage",
        "base_tips": [
            "Miglustat (substrate reduction therapy) for NPC — adhere to dosing schedule.",
            "Dysphagia management: modified diet and swallowing therapy.",
            "Avoid sedating medications unless carefully supervised — they worsen neurological decline.",
            "Occupational and physiotherapy to maintain function as long as possible.",
            "Annual liver and spleen ultrasound.",
            "Ophthalmology for vertical gaze palsy monitoring.",
            "Genetic counselling for family members.",
            "Cataplexy management if narcolepsy-cataplexy is present (NPC).",
        ],
        "dietary": [
            "Low-fat diet may reduce hepatic lipid accumulation.",
            "Soft foods when dysphagia develops.",
        ],
        "emergency_signs": ["Acute liver failure", "Aspiration pneumonia", "Severe psychiatric crisis"],
    },

    "Mucopolysaccharidosis (MPS)": {
        "category": "Metabolic/Lysosomal Storage",
        "base_tips": [
            "Enzyme replacement therapy (available for MPS I, II, IVA, VI, VII) — commence promptly.",
            "Annual cardiac echo — valvular disease and cardiomyopathy are common.",
            "Airway management: obstructive sleep apnoea is near-universal — sleep study yearly.",
            "Orthopaedic monitoring for spinal cord compression (atlantoaxial instability).",
            "Ophthalmology: corneal clouding management, glaucoma screening.",
            "ENT review for hearing loss and recurrent ear infections.",
            "Physiotherapy for joint stiffness and contractures.",
            "Neurocognitive monitoring — MPS I, II, III have CNS involvement.",
        ],
        "age_modifiers": {
            "child":  ["Haematopoietic stem cell transplantation (HSCT) for MPS I — best outcomes before age 2.5.", "Educational support for cognitive delays."],
        },
        "emergency_signs": ["Sudden neck pain/weakness (spinal cord compression)", "Acute respiratory compromise", "Cardiac decompensation"],
    },

    # ── BLOOD / COAGULATION ─────────────────────────────────────────────────
    "Hemophilia A": {
        "category": "Blood Disorders/Coagulation",
        "base_tips": [
            "Prophylactic factor VIII infusions as prescribed — do not skip doses.",
            "Wear a medical alert bracelet at all times.",
            "Avoid NSAIDs (aspirin, ibuprofen) — they worsen bleeding by inhibiting platelets.",
            "Avoid contact sports (boxing, football) — opt for swimming, cycling, golf.",
            "Ensure surgeons and dentists are informed before any procedure.",
            "Home infusion programme: learn self-infusion for bleeding episodes.",
            "Joint physiotherapy after haemarthroses — prevents arthropathy.",
            "Inhibitor testing annually — some patients develop antibodies to factor VIII.",
        ],
        "age_modifiers": {
            "child":  ["Prophylaxis should begin before the first joint bleed — ideally by age 2."],
            "adult":  ["Monitor for haemophilic arthropathy — orthopaedic review if joint disease progresses."],
        },
        "emergency_signs": ["Head injury — any blow to the head requires immediate ER assessment", "Throat or neck bleeding (airway risk)", "Severe abdominal pain (internal haemorrhage)"],
    },

    "Sickle Cell Disease": {
        "category": "Blood Disorders/Hemoglobin",
        "base_tips": [
            "Stay well hydrated (2–3 litres daily) — dehydration triggers vaso-occlusive crises.",
            "Avoid extreme cold and altitude — both trigger sickling.",
            "Avoid strenuous exercise in heat — warm up slowly.",
            "Penicillin prophylaxis in children (until age 5) — functional asplenia increases infection risk.",
            "Vaccinate: pneumococcal, meningococcal, Hib, influenza annually.",
            "Folic acid 5 mg daily to support red cell production.",
            "Hydroxyurea therapy as prescribed — reduces crisis frequency significantly.",
            "Regular ophthalmology — sickle retinopathy screening annually.",
            "Annual transcranial Doppler in children age 2–16 to screen for stroke risk.",
        ],
        "age_modifiers": {
            "child":  ["Dactylitis (hand-foot syndrome) is often the first crisis — early pain management."],
            "teen":   ["Priapism risk in males — seek immediate care if erection lasts >4 hours."],
            "adult":  ["Chronic organ damage surveillance: kidney, heart, lung, eye annually."],
        },
        "region_modifiers": {
            "high_uv": ["India/tropical: protect from heat and ensure outdoor activities are in cooler parts of the day."],
        },
        "dietary": [
            "High fluid intake throughout the day.",
            "Iron-rich foods (spinach, lentils) with caution — excess iron from transfusions can accumulate.",
            "Folic acid from foods (dark leafy greens, beans) in addition to supplementation.",
        ],
        "emergency_signs": ["Sudden severe headache or stroke symptoms", "Acute chest syndrome (chest pain + fever + breathing difficulty)", "Priapism lasting >4 hours", "Acute abdomen (splenic sequestration)"],
    },

    "Hereditary Hemorrhagic Telangiectasia": {
        "category": "Vascular/Genetic",
        "base_tips": [
            "Avoid NSAIDs and blood thinners unless directed by a specialist.",
            "Use saline nasal sprays and humidifiers — epistaxis prevention is key.",
            "MRI liver and lung screening for arteriovenous malformations (AVMs).",
            "Brain MRI to detect cerebral AVMs — rupture risk.",
            "Iron supplementation and anaemia monitoring due to chronic blood loss.",
            "Avoid heavy lifting and Valsalva manoeuvres if intracranial AVMs present.",
            "Genetic counselling — autosomal dominant, 50% inheritance risk.",
            "Carry emergency card detailing HHT and AVM locations.",
        ],
        "emergency_signs": ["Severe uncontrolled nosebleed", "Stroke symptoms", "Sudden severe headache", "Haemoptysis (coughing blood)"],
    },

    # ── AUTOIMMUNE ──────────────────────────────────────────────────────────
    "Systemic Lupus Erythematosus (SLE)": {
        "category": "Autoimmune",
        "base_tips": [
            "Strict sun protection — UV light triggers lupus flares; use SPF 50+ daily.",
            "Avoid smoking — it worsens disease activity and cardiovascular risk.",
            "Take hydroxychloroquine consistently as prescribed — reduces flare frequency.",
            "Monitor blood pressure and kidney function monthly during active disease.",
            "Vaccinate against flu and pneumococcus — immunosuppression increases infection risk.",
            "Avoid sulpha drugs and UV-activating medications — they can trigger flares.",
            "Bone density DEXA scan — long-term steroids cause osteoporosis.",
            "Cardiovascular risk management: statins, BP control — lupus is a major CV risk factor.",
            "Pregnancy in lupus requires specialist pre-conception planning.",
        ],
        "age_modifiers": {
            "teen":   ["Adolescent-onset SLE is often more severe — strict adherence to medications."],
            "adult":  ["Antiphospholipid syndrome screening — blood clot risk management."],
            "senior": ["Drug-induced lupus (from antihypertensives, etc.) should be ruled out."],
        },
        "region_modifiers": {
            "high_uv": ["India: daily SPF 50+ is non-negotiable; UV-protective umbrella/clothing for all outdoor activities."],
        },
        "dietary": [
            "Anti-inflammatory Mediterranean diet (olive oil, fish, vegetables).",
            "Vitamin D supplementation if levels low.",
            "Reduce salt and saturated fat to protect cardiovascular health.",
            "Avoid alfalfa sprouts — they contain L-canavanine which triggers lupus flares.",
        ],
        "emergency_signs": ["Lupus nephritis (blood/protein in urine, sudden swelling)", "Seizures or psychosis", "Severe chest pain (serositis/pericarditis)", "Blood clots (DVT/PE)"],
    },

    "Sjogren Syndrome": {
        "category": "Autoimmune",
        "base_tips": [
            "Use preservative-free artificial tears 4–6 times daily for dry eyes.",
            "Wear moisture-chamber glasses in air-conditioned or windy environments.",
            "Stimulate saliva with sugar-free chewing gum, lozenges, or pilocarpine.",
            "Dental check-ups every 6 months — dry mouth causes accelerated tooth decay.",
            "Avoid antihistamines and decongestants — they worsen dryness.",
            "Use vaginal moisturisers and lubricants for vaginal dryness.",
            "Monitor for non-Hodgkin lymphoma — Sjögren patients have 5× higher risk.",
            "Annual parotid gland examination for swelling/hardness.",
        ],
        "dietary": [
            "Stay well hydrated; sip water throughout the day.",
            "Omega-3 fatty acids (fish, flaxseed) may reduce ocular inflammation.",
            "Avoid spicy, acidic, or crunchy foods that irritate dry mouth.",
        ],
        "emergency_signs": ["Rapidly enlarging salivary gland (lymphoma suspicion)", "Severe neuropathy", "Kidney involvement (tubulointerstitial nephritis)"],
    },

    "Ehlers-Danlos Syndrome": {
        "category": "Connective Tissue",
        "base_tips": [
            "Avoid high-impact sports (gymnastics, contact sports) — joint hypermobility causes dislocations.",
            "Physiotherapy focusing on muscle strengthening to stabilise joints.",
            "Use joint splints/braces during activity.",
            "Wear protective padding to prevent skin injury — skin fragility varies by EDS type.",
            "Cardiovascular EDS: annual echocardiography to monitor aortic root dilation.",
            "Inform surgeons — wound healing may be impaired in some EDS subtypes.",
            "Pacing strategies for fatigue management — avoid boom-bust activity cycles.",
            "Psychological support for chronic pain management (CBT, mindfulness).",
        ],
        "age_modifiers": {
            "child":  ["Encourage low-impact activities (swimming, cycling) to develop strength safely."],
            "adult":  ["Occupational therapy for ergonomic workplace modifications."],
        },
        "emergency_signs": ["Aortic dissection symptoms (tearing chest/back pain)", "Major joint dislocation with nerve compromise"],
    },

    "Myasthenia Gravis": {
        "category": "Autoimmune/Neuromuscular",
        "base_tips": [
            "Avoid medications that worsen MG: aminoglycosides, fluoroquinolones, beta-blockers, magnesium.",
            "Rest periods are essential — muscles weaken with sustained use.",
            "Pyridostigmine timing: take before activities requiring muscle strength (meals, physical tasks).",
            "Avoid heat (hot showers, outdoor heat) — warmth worsens MG weakness transiently.",
            "Eye patching for double vision when driving.",
            "Avoid emotional stress — it precipitates myasthenic crisis.",
            "Thymoma screening: CT chest at diagnosis and follow-up.",
            "Vaccinations should be inactivated (live vaccines avoided with immunosuppression).",
        ],
        "region_modifiers": {
            "high_uv": ["Hot climate: air-conditioned environments reduce weakness episodes; avoid outdoor midday heat."],
        },
        "dietary": [
            "Small, frequent meals — jaw and swallowing muscles fatigue quickly.",
            "Soft foods during periods of increased weakness.",
            "Take pyridostigmine 30–45 minutes before eating to maximise swallowing strength.",
        ],
        "emergency_signs": ["Myasthenic crisis (inability to breathe or swallow)", "Rapid onset of respiratory weakness"],
    },

    "Guillain-Barré Syndrome": {
        "category": "Autoimmune/Neurological",
        "base_tips": [
            "Rehabilitation is essential post-acute phase — physiotherapy, occupational therapy, and speech therapy.",
            "Fall prevention: weakness and balance issues persist for months post-treatment.",
            "DVT prevention: compression stockings and mobility exercises during immobility.",
            "Pain management: GBS neuropathic pain is severe — discuss gabapentin/pregabalin with neurologist.",
            "Psychological support: depression is common during prolonged recovery.",
            "Respiratory monitoring even after ICU discharge — weakness can return.",
            "Avoid re-infection triggers (flu, Campylobacter food poisoning).",
            "Graded return to physical activity supervised by physiotherapist.",
        ],
        "emergency_signs": ["Rapidly ascending paralysis", "Respiratory compromise", "Autonomic instability (BP swings, arrhythmia)"],
    },

    # ── CONNECTIVE TISSUE ───────────────────────────────────────────────────
    "Marfan Syndrome": {
        "category": "Connective Tissue",
        "base_tips": [
            "Annual echocardiography to monitor aortic root diameter — dissection is the main killer.",
            "Beta-blockers or ARBs (losartan) as prescribed to slow aortic root dilation.",
            "Avoid strenuous exercise, contact sports, isometric exercises, and competitive athletics.",
            "Permissible activities: low-impact cardio (walking, cycling at moderate pace), swimming.",
            "Slit-lamp eye exam annually — ectopia lentis (lens dislocation) monitoring.",
            "Orthopaedic review for scoliosis — bracing or surgery if curvature progresses.",
            "Inform all surgeons — connective tissue fragility makes procedures high-risk.",
            "Genetic counselling — autosomal dominant, 50% inheritance risk per child.",
        ],
        "age_modifiers": {
            "child":  ["Ophthalmology review every year — lens dislocation in childhood requires prompt management."],
            "teen":   ["Scoliosis progresses rapidly during adolescent growth spurts — close monitoring needed."],
            "adult":  ["Pre-pregnancy aortic root diameter assessment — risk of dissection increases in pregnancy."],
        },
        "emergency_signs": ["Sudden tearing chest or back pain (aortic dissection)", "Sudden vision change (lens dislocation)", "Spontaneous pneumothorax (chest pain + breathlessness)"],
    },

    "Osteogenesis Imperfecta": {
        "category": "Connective Tissue/Bone",
        "base_tips": [
            "Bisphosphonate therapy as prescribed to improve bone density.",
            "Avoid high-impact activities and falls — all fractures should be immobilised properly.",
            "Swimming and hydrotherapy are the safest exercises — minimal fracture risk.",
            "Custom orthotics and supportive footwear for mobility support.",
            "Annual DEXA bone density scan.",
            "Dentistry attention — dentinogenesis imperfecta requires specialist dental care.",
            "Hearing testing annually — progressive hearing loss is common.",
            "Genetic counselling — dominant and recessive forms exist.",
        ],
        "age_modifiers": {
            "child":  ["Rod surgery for long bones reduces fracture frequency significantly.", "Protect child from accidental falls at school — inform teachers."],
        },
        "emergency_signs": ["New fracture after minor trauma", "Basilar invagination symptoms (neck pain, headache, dysphagia)"],
    },

    # ── ENDOCRINE ───────────────────────────────────────────────────────────
    "Addison Disease": {
        "category": "Endocrine/Adrenal",
        "base_tips": [
            "Never miss hydrocortisone and fludrocortisone doses — life depends on it.",
            "Sick day rules: double or triple hydrocortisone dose during illness, surgery, or injury.",
            "Carry an emergency IM hydrocortisone injection kit at all times.",
            "Wear medical alert bracelet/necklace stating 'Adrenal Insufficiency — needs emergency hydrocortisone'.",
            "Increase sodium intake in hot weather, after heavy exercise, or with vomiting/diarrhoea.",
            "Avoid fasting and prolonged intense exercise without dose adjustment.",
            "Inform all healthcare providers — many medications affect steroid metabolism.",
            "Annual adrenal antibody and ACTH stimulation testing.",
        ],
        "region_modifiers": {
            "high_uv": ["India/tropical: high heat causes increased salt loss — extra salt/sodium intake is critical on hot days."],
        },
        "dietary": [
            "Higher sodium diet, especially in heat and during exercise.",
            "Eat regularly — skipping meals can precipitate adrenal crisis.",
            "Adequate potassium foods (banana, sweet potato) to balance fludrocortisone effects.",
        ],
        "emergency_signs": ["Adrenal crisis: severe vomiting, confusion, extreme weakness, hypotension — CALL EMERGENCY SERVICES IMMEDIATELY", "Unexplained hypoglycaemia"],
    },

    "Acromegaly": {
        "category": "Endocrine",
        "base_tips": [
            "Pituitary MRI every 6–12 months post-treatment to monitor tumour.",
            "IGF-1 and GH monitoring every 3–6 months.",
            "Cardiovascular assessment: echocardiogram, blood pressure monitoring annually.",
            "Diabetes screening every 6 months — GH excess causes insulin resistance.",
            "Sleep study annually — sleep apnoea affects 70% of acromegaly patients.",
            "Colonoscopy every 3–5 years — increased risk of colonic polyps.",
            "Joint pain management: physiotherapy, low-impact exercise.",
            "Somatostatin analogues (octreotide/lanreotide) as prescribed.",
        ],
        "dietary": [
            "Low glycaemic index diet to manage insulin resistance.",
            "Reduce processed sugars to control diabetes risk.",
        ],
        "emergency_signs": ["Sudden vision loss (pituitary apoplexy)", "Severe headache", "Diabetic ketoacidosis"],
    },

    # ── RESPIRATORY / METABOLIC ─────────────────────────────────────────────
    "Cystic Fibrosis": {
        "category": "Respiratory/Genetic",
        "base_tips": [
            "Airway clearance therapy (vest, flutter valve, manual percussion) twice daily.",
            "Inhaled hypertonic saline and DNase as prescribed.",
            "CFTR modulator therapy (ivacaftor/lumacaftor/elexacaftor) if eligible — transformative.",
            "Flu and pneumococcal vaccination annually.",
            "Avoid smoking and second-hand smoke completely.",
            "Pulmonary function tests every 3 months.",
            "Pancreatic enzyme replacement with every meal containing fat.",
            "Annual glucose tolerance test — CF-related diabetes is common.",
            "Bone density monitoring — CF causes early osteoporosis.",
            "Nutritional support: CF requires 120–150% of normal caloric intake.",
        ],
        "age_modifiers": {
            "child":  ["Newborn screening: early CFTR therapy dramatically improves outcomes.", "Chest physiotherapy twice daily even when well."],
            "adult":  ["Lung transplant evaluation when FEV1 <30%."],
        },
        "dietary": [
            "High-calorie, high-fat, high-salt diet.",
            "Pancreatic enzyme supplements with every meal.",
            "Fat-soluble vitamins (A, D, E, K) supplementation.",
            "Salt tablets in hot weather.",
        ],
        "emergency_signs": ["Haemoptysis", "Pneumothorax (sudden chest pain/shortness of breath)", "Rapid lung function decline"],
    },

    "Alpha-1 Antitrypsin Deficiency": {
        "category": "Metabolic/Respiratory",
        "base_tips": [
            "Never smoke — smoking is the single most devastating accelerant of lung destruction.",
            "Avoid second-hand smoke and occupational dust/fumes exposure.",
            "Augmentation therapy (intravenous A1AT) where eligible — discuss with pulmonologist.",
            "Annual spirometry and DLCO (lung diffusion) testing.",
            "Liver ultrasound every 6–12 months — A1AT accumulates in hepatocytes.",
            "Vaccinate against Hepatitis A and B, flu, pneumococcus.",
            "Pulmonary rehabilitation programme.",
            "Oxygen therapy if SpO2 <88%.",
        ],
        "region_modifiers": {
            "high_pollution": ["High-pollution cities: N95 mask during poor air quality days; air purifier at home."],
        },
        "dietary": [
            "Avoid alcohol — worsens liver damage.",
            "Anti-inflammatory diet (Mediterranean) to support lung and liver health.",
        ],
        "emergency_signs": ["Acute respiratory exacerbation", "Jaundice with acute liver failure", "Pneumothorax"],
    },

    # ── GENETIC/CHROMOSOMAL ─────────────────────────────────────────────────
    "Phenylketonuria (PKU)": {
        "category": "Metabolic/Amino Acid",
        "base_tips": [
            "Strict phenylalanine-restricted diet for life — even minor lapses cause brain damage.",
            "Use prescribed medical phenylalanine-free formula as directed.",
            "Monthly blood phenylalanine levels — target varies by age and guidelines.",
            "Sapropterin (BH4 cofactor) therapy for responsive PKU — discuss with metabolic team.",
            "School and workplace accommodations for cognitive effects.",
            "Psychological support — anxiety and depression are very common in PKU.",
            "Women of childbearing age: strict PKU control before and throughout pregnancy (maternal PKU).",
            "Annual neuropsychological assessment.",
        ],
        "dietary": [
            "Avoid: meat, fish, eggs, dairy, legumes, nuts, regular bread — all are high phenylalanine.",
            "Safe foods: fruits, most vegetables, special low-protein PKU products.",
            "Supplement amino acids, vitamins, and minerals via PKU formula.",
        ],
        "emergency_signs": ["Seizures outside normal pattern", "Severe psychiatric deterioration", "Pregnancy with loss of dietary control"],
    },

    "Hutchinson-Gilford Progeria": {
        "category": "Genetic/Premature Aging",
        "base_tips": [
            "Lonafarnib therapy as prescribed — only approved disease-modifying treatment.",
            "Cardiovascular monitoring every 6 months — atherosclerosis is the primary cause of death.",
            "Low-dose aspirin for cardiovascular protection (doctor-directed).",
            "Physical therapy to maintain mobility and prevent joint contractures.",
            "Nutritional support — children with progeria require high-calorie intake.",
            "Dental care — delayed dentition and overcrowding require specialist orthodontic care.",
            "Sun protection — thin skin is very sensitive.",
            "Psychosocial support for child and family — connect with Progeria Research Foundation.",
        ],
        "emergency_signs": ["Chest pain (myocardial infarction — can occur in young children)", "Stroke symptoms", "Acute hip dislocation"],
    },

    # ── HAEMATOLOGICAL / ONCOLOGICAL ───────────────────────────────────────
    "Systemic Mastocytosis": {
        "category": "Hematological/Mast Cell",
        "base_tips": [
            "Carry self-injectable epinephrine (EpiPen) at all times — anaphylaxis risk is high.",
            "Wear medical alert bracelet detailing mastocytosis and anaphylaxis risk.",
            "Identify and avoid personal triggers: insect stings, certain medications (NSAIDs, opioids, vancomycin), alcohol, hot baths, sudden temperature changes.",
            "All insect stings require immediate ER assessment — venom immunotherapy recommended.",
            "Pre-medicate with antihistamines and oral steroids before procedures/surgeries.",
            "Bone density monitoring — mastocytosis causes severe osteoporosis.",
            "Annual tryptase level and haematology follow-up.",
            "Avoid NSAIDs — they trigger mast cell degranulation.",
        ],
        "dietary": [
            "Avoid: alcohol, fermented foods, aged cheeses, spinach, tomatoes, strawberries (histamine-liberating).",
            "Low-histamine diet during flare periods.",
        ],
        "emergency_signs": ["Anaphylaxis — administer EpiPen and call emergency services", "Sudden hypotension", "Loss of consciousness"],
    },

    "Primary Amyloidosis (AL)": {
        "category": "Metabolic/Protein Deposition",
        "base_tips": [
            "Chemotherapy (daratumumab-based regimens) + autologous stem cell transplant where eligible.",
            "Cardiac monitoring: echocardiogram every 3–6 months — cardiac AL is most fatal.",
            "Avoid NSAIDs completely — severe nephrotoxicity risk.",
            "Fluid restriction if cardiomyopathy or nephrotic syndrome present.",
            "Compression stockings for orthostatic hypotension.",
            "Maintain dietary protein intake despite renal impairment (under dietitian guidance).",
            "Neuropathy pain management plan with neurologist.",
            "Monitor for gastrointestinal bleeding — macroglossia and GI amyloid cause complications.",
        ],
        "dietary": [
            "Low-sodium diet for oedema management.",
            "Adequate protein with kidney-safe foods under dietitian guidance.",
            "Avoid high-potassium foods if renal function is significantly impaired.",
        ],
        "emergency_signs": ["Acute cardiac decompensation (sudden breathlessness, leg swelling)", "Syncope (autonomic neuropathy)", "Severe gastrointestinal bleeding"],
    },

    # ── VASCULAR ────────────────────────────────────────────────────────────
    "Klippel-Trénaunay Syndrome": {
        "category": "Vascular/Congenital",
        "base_tips": [
            "Wear graduated compression stockings daily to manage venous insufficiency and lymphoedema.",
            "Elevate affected limb when resting.",
            "Annual vascular ultrasound to monitor varicose veins and deep venous anomalies.",
            "Avoid prolonged standing or sitting — increases venous pressure.",
            "Avoid contact sports — port wine stain and venous anomalies increase bleeding risk.",
            "Thromboprophylaxis for travel and surgery — high DVT risk.",
            "Dermatology for port wine stain management (laser therapy).",
            "Orthopaedic monitoring for limb length discrepancy — special footwear/orthotics may be needed.",
        ],
        "emergency_signs": ["Deep vein thrombosis or pulmonary embolism symptoms", "Gastrointestinal bleeding", "Sudden increase in limb swelling"],
    },

    # ── OTHER METABOLIC ─────────────────────────────────────────────────────
    "Acute Intermittent Porphyria": {
        "category": "Metabolic/Heme Synthesis",
        "base_tips": [
            "Identify and avoid attack triggers: fasting, alcohol, hormones, stress, many medications.",
            "Carry a list of unsafe medications — the Drugs in Porphyria database is essential.",
            "Never skip meals — fasting is a major trigger.",
            "Avoid alcohol completely.",
            "High-carbohydrate diet especially during prodrome of attack.",
            "Givosiran (siRNA therapy) for recurrent attacks — discuss with specialist.",
            "Hemin (haematin) infusion for acute attacks — have hospital plan ready.",
            "Monitoring: blood pressure, sodium levels, urinary ALA/PBG during attacks.",
        ],
        "dietary": [
            "Never fast — eat carbohydrate-rich snacks every 3–4 hours.",
            "Glucose/sucrose loading at first sign of attack.",
            "Alcohol is absolutely prohibited.",
        ],
        "emergency_signs": ["Severe abdominal pain + dark urine + neurological symptoms = acute porphyria attack — urgent hospitalisation", "Respiratory paralysis", "Seizures with hyponatraemia"],
    },

    "Alkaptonuria": {
        "category": "Metabolic/Amino Acid",
        "base_tips": [
            "Nitisinone therapy — reduces homogentisic acid production significantly.",
            "Low-protein diet to reduce phenylalanine and tyrosine intake.",
            "Vitamin C supplementation — antioxidant to slow ochronosis.",
            "Joint protection: avoid repetitive heavy joint loading.",
            "Annual cardiac echo — ochronotic heart valve disease.",
            "Spinal X-ray every 2–3 years — disc calcification monitoring.",
            "Renal ultrasound for kidney stone surveillance.",
            "Occupational therapy to adapt to progressive joint disease.",
        ],
        "dietary": [
            "Reduce dietary protein (especially phenylalanine/tyrosine-rich foods).",
            "High-dose Vitamin C (1g/day) to slow pigment deposition.",
        ],
        "emergency_signs": ["Acute joint lock (calcified disc herniation)", "Cardiac valve failure", "Renal colic (kidney stones)"],
    },

    "Hypophosphatasia": {
        "category": "Metabolic/Bone",
        "base_tips": [
            "Asfotase alfa (enzyme replacement) therapy for severe forms.",
            "Avoid vitamin D and calcium supplementation unless specifically directed — they worsen hypercalcaemia in hypophosphatasia.",
            "Dental care: premature tooth loss is hallmark — paediatric dentist familiar with HPP required.",
            "Fracture prevention: avoid high-impact activities.",
            "Physiotherapy to maintain muscle strength.",
            "Seizure management (pyridoxine for pyridoxine-responsive seizures in infants).",
            "Renal ultrasound for nephrocalcinosis monitoring.",
        ],
        "emergency_signs": ["Fracture after minor trauma (stress fractures)", "Seizures in infancy (pyridoxine-responsive)", "Renal colic"],
    },

    # ── GENETIC / OTHER ─────────────────────────────────────────────────────
    "Progeria": {  # Alias
        "category": "Genetic/Premature Aging",
        "base_tips": [
            "Lonafarnib therapy as prescribed.",
            "Cardiac monitoring every 6 months.",
            "Physical therapy to maintain mobility.",
            "Nutritional support — high-calorie needs.",
            "Sun protection for thin fragile skin.",
        ],
        "emergency_signs": ["Chest pain", "Stroke symptoms"],
    },
}


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _get_age_group(age: Optional[int]) -> str:
    if age is None:
        return "adult"
    if age < 13:
        return "child"
    if age < 20:
        return "teen"
    if age < 65:
        return "adult"
    return "senior"


def _is_high_uv_region(region: Optional[str]) -> bool:
    if not region:
        return False
    return region.lower().strip() in HIGH_UV_REGIONS


def _is_high_pollution_region(region: Optional[str]) -> bool:
    if not region:
        return False
    return region.lower().strip() in HIGH_POLLUTION_REGIONS


def _is_high_copper_water_region(region: Optional[str]) -> bool:
    if not region:
        return False
    return region.lower().strip() in HIGH_COPPER_WATER_REGIONS


def _fuzzy_match_disease(name: str) -> Optional[str]:
    """Case-insensitive partial match to handle slight name variations."""
    name_lower = name.lower().strip()
    for key in DISEASE_ADVICE:
        if key.lower() == name_lower:
            return key
        if name_lower in key.lower() or key.lower() in name_lower:
            return key
    return None


# ---------------------------------------------------------------------------
# Main Engine
# ---------------------------------------------------------------------------

class PreventiveAdviceEngine:
    """
    Returns personalised preventive advice for a detected rare disease,
    taking into account patient demographics (age, skin type, region).
    """

    def get_advice(
        self,
        disease_name: str,
        demographics: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Parameters
        ----------
        disease_name : str
            The top-1 or any predicted disease name.
        demographics : dict, optional
            Keys: age (int), gender (str), skin_type (str, e.g. 'type_iii'),
                  region (str, e.g. 'India'), ethnicity (str)

        Returns
        -------
        dict with keys:
            disease         – matched disease name
            category        – disease category
            tips            – list of personalised tip strings
            dietary         – list of dietary advice strings
            emergency_signs – list of emergency red-flag strings
            personalization_context – dict explaining why modifiers were applied
        """
        demographics = demographics or {}
        age = demographics.get("age")
        skin_type = (demographics.get("skin_type") or "").lower().replace(" ", "_")
        region = demographics.get("region", "")

        # Match disease
        matched_key = _fuzzy_match_disease(disease_name)
        if not matched_key:
            return self._generic_advice(disease_name)

        d = DISEASE_ADVICE[matched_key]
        age_group = _get_age_group(age)

        tips: List[str] = list(d.get("base_tips", []))
        personalization_context: Dict[str, Any] = {}

        # Age-based modifiers
        age_mods = d.get("age_modifiers", {})
        if age_group in age_mods:
            tips.extend(age_mods[age_group])
            personalization_context["age_group"] = age_group
            if age is not None:
                personalization_context["age"] = age

        # Regional modifiers
        region_mods = d.get("region_modifiers", {})
        if _is_high_uv_region(region) and "high_uv" in region_mods:
            tips.extend(region_mods["high_uv"])
            personalization_context["region_modifier"] = f"High UV region detected: {region}"
        if _is_high_pollution_region(region) and "high_pollution" in region_mods:
            tips.extend(region_mods["high_pollution"])
            personalization_context["region_modifier"] = f"High pollution region detected: {region}"
        if _is_high_copper_water_region(region) and "high_copper_water" in region_mods:
            tips.extend(region_mods["high_copper_water"])
            personalization_context["copper_water_advisory"] = True

        # Skin type (primarily for skin diseases)
        if skin_type in SKIN_TYPE_ADVICE and matched_key in ("Melanoma", "Basal Cell Carcinoma", "Squamous Cell Carcinoma (SCC)", "Systemic Lupus Erythematosus (SLE)"):
            skin_note = SKIN_TYPE_ADVICE[skin_type]
            tips.append(f"Skin type advisory: {skin_note}")
            personalization_context["skin_type"] = skin_type

        return {
            "disease": matched_key,
            "category": d.get("category", "General"),
            "tips": tips,
            "dietary": d.get("dietary", []),
            "emergency_signs": d.get("emergency_signs", []),
            "personalization_context": personalization_context,
        }

    def get_advice_for_top5(
        self,
        top5: List[Dict[str, Any]],
        demographics: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Returns advice for all top-5 predicted diseases.
        `top5` is a list of {'name': str, 'probability': float, ...} dicts.
        """
        result = []
        for entry in top5:
            disease_name = entry.get("name", "")
            advice = self.get_advice(disease_name, demographics)
            advice["probability"] = entry.get("probability", 0.0)
            result.append(advice)
        return result

    def _generic_advice(self, disease_name: str) -> Dict[str, Any]:
        """Fallback advice for diseases not in our database."""
        return {
            "disease": disease_name,
            "category": "Rare Disease",
            "tips": [
                "Consult a specialist in rare diseases immediately.",
                "Do not start, stop, or change any medications without medical supervision.",
                "Keep a symptom journal to track progression and triggers.",
                "Connect with patient advocacy groups for your specific disease.",
                "Ensure all treating physicians are aware of your rare disease diagnosis.",
                "Genetic counselling is recommended for you and first-degree family members.",
                "Register with a rare disease registry to contribute to research.",
                "Carry a medical summary card with your diagnosis, medications, and emergency contacts.",
            ],
            "dietary": [
                "Discuss dietary modifications with a specialist — many rare diseases have specific nutritional needs.",
                "Maintain a balanced, anti-inflammatory diet (Mediterranean) as a general baseline.",
                "Stay well hydrated unless fluid restriction is prescribed.",
            ],
            "emergency_signs": [
                "Sudden severe symptom worsening",
                "Loss of consciousness",
                "Breathing difficulty",
                "Seek ER immediately if you feel unsafe",
            ],
            "personalization_context": {"note": "Disease not found in database; generic advice provided"},
        }


# ---------------------------------------------------------------------------
# Flask Integration Helper
# ---------------------------------------------------------------------------

def inject_preventive_advice(
    response_dict: Dict[str, Any],
    demographics: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Drop-in helper for routes/diagnosis.py predict().
    Pass the response dict before jsonify — it will add 'preventive_advice' key.

    Usage in diagnosis.py:
        from preventive_advice_engine import inject_preventive_advice
        response = inject_preventive_advice(response, demographics)
        return jsonify(response)
    """
    engine = PreventiveAdviceEngine()
    top5 = response_dict.get("top_diseases", [])
    if top5:
        advice_list = engine.get_advice_for_top5(top5, demographics)
        response_dict["preventive_advice"] = advice_list
    return response_dict


# ---------------------------------------------------------------------------
# CLI test harness
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    engine = PreventiveAdviceEngine()

    test_cases = [
        ("Melanoma",                    {"age": 45, "skin_type": "type_ii", "region": "India"}),
        ("Sickle Cell Disease",         {"age": 12, "region": "Tamil Nadu"}),
        ("Wilson Disease",              {"age": 25, "region": "India"}),
        ("Fabry Disease",               {"age": 35, "region": "Kerala"}),
        ("Systemic Lupus Erythematosus (SLE)", {"age": 28, "gender": "female", "region": "Mumbai"}),
        ("Cystic Fibrosis",             {"age": 8}),
        ("Addison Disease",             {"age": 40, "region": "Rajasthan"}),
        ("Huntington Disease",          {"age": 45}),
        ("Marfan Syndrome",             {"age": 17}),
        ("Hemophilia A",                {"age": 5}),
    ]

    for disease, demo in test_cases:
        advice = engine.get_advice(disease, demo)
        print(f"\n{'='*60}")
        print(f"Disease : {advice['disease']}")
        print(f"Category: {advice['category']}")
        print(f"Context : {advice['personalization_context']}")
        print(f"Tips ({len(advice['tips'])}):")
        for t in advice["tips"]:
            print(f"  • {t}")
        print(f"Dietary:")
        for d in advice["dietary"]:
            print(f"  🥗 {d}")
        print(f"Emergency Signs:")
        for e in advice["emergency_signs"]:
            print(f"  🚨 {e}")
