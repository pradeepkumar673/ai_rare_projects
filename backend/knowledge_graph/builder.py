"""
Builds a knowledge graph from Orphanet XML with HPO symptom mapping.
"""
import json
import networkx as nx
import xml.etree.ElementTree as ET
from urllib.request import urlopen
import joblib
import os
from typing import List, Dict, Tuple, Any, Optional

class KnowledgeGraph:
    """
    Graph of diseases, symptoms, and genes. Uses a synonym file to map HPO terms
    to our symptom names.
    """
    def __init__(self, json_path: Optional[str] = None,
                 synonym_path: Optional[str] = None,
                 cache_path: str = 'kg_cache.pkl'):
        self.graph = nx.Graph()
        self.synonym_map: Dict[str, str] = {}
        if synonym_path and os.path.exists(synonym_path):
            with open(synonym_path) as f:
                self.synonym_map = json.load(f)

        if json_path and os.path.exists(json_path):
            self.load_from_json(json_path)
        elif cache_path and os.path.exists(cache_path):
            self.graph = joblib.load(cache_path)
        else:
            self.build_from_orphanet()
            joblib.dump(self.graph, cache_path)

    def build_from_orphanet(self) -> None:
        """Download en_product1.xml and build graph. Fallback to demo if fails."""
        url = "http://www.orphadata.org/data/xml/en_product1.xml"
        print("Downloading Orphanet XML...")
        try:
            response = urlopen(url, timeout=30)
            tree = ET.parse(response)
            root = tree.getroot()
        except Exception as e:
            print(f"Orphanet download failed: {e}. Using demo graph.")
            self._build_demo()
            return

        ns = {'orph': 'http://www.orphadata.org/data/schemas'}

        for disorder in root.findall('.//orph:Disorder', ns):
            disease_id = disorder.find('orph:OrphaCode', ns).text
            disease_name = disorder.find('orph:Name', ns).text
            self.graph.add_node(disease_name, type='disease', orpha_code=disease_id)

            # Symptoms (HPO)
            for symptom in disorder.findall('.//orph:HPODisorderAssociation/orph:HPO', ns):
                hpo_id = symptom.find('orph:HPOId', ns).text
                hpo_term = symptom.find('orph:HPOTerm', ns).text
                mapped = self.synonym_map.get(hpo_id, hpo_term.lower())
                self.graph.add_node(mapped, type='symptom', hpo_id=hpo_id)
                self.graph.add_edge(disease_name, mapped, relation='symptom_of')

            # Genes
            for gene in disorder.findall('.//orph:GeneList/orph:Gene', ns):
                gene_name = gene.find('orph:Name', ns).text
                self.graph.add_node(gene_name, type='gene')
                self.graph.add_edge(disease_name, gene_name, relation='caused_by')

        print(f"Graph built: {self.graph.number_of_nodes()} nodes, {self.graph.number_of_edges()} edges")

    def _build_demo(self) -> None:
        """Fallback demo graph."""
        self.graph.add_node('fever', type='symptom')
        self.graph.add_node('cough', type='symptom')
        self.graph.add_node('Malaria', type='disease')
        self.graph.add_edge('Malaria', 'fever', relation='symptom_of')
        self.graph.add_edge('Malaria', 'cough', relation='symptom_of')
        self.graph.add_node('seizure', type='symptom')
        self.graph.add_node('Epilepsy', type='disease')
        self.graph.add_edge('Epilepsy', 'seizure', relation='symptom_of')
        print("Demo graph built.")

    def load_from_json(self, json_path: str) -> None:
        with open(json_path, 'r') as f:
            data = json.load(f)
        for node in data.get('nodes', []):
            self.graph.add_node(node['id'], **node['attrs'])
        for edge in data.get('edges', []):
            self.graph.add_edge(edge['source'], edge['target'], **edge['attrs'])

    def get_related_diseases(self, symptoms: List[str], max_results: int = 10) -> List[Tuple[str, float]]:
        """
        Given a list of symptom names, return diseases with scores.
        Score = number of direct symptom matches + PageRank if few direct.
        """
        disease_scores: Dict[str, float] = {}
        # Direct matches
        for sym in symptoms:
            if sym not in self.graph:
                continue
            for neighbor in self.graph.neighbors(sym):
                if self.graph.nodes[neighbor].get('type') == 'disease':
                    disease_scores[neighbor] = disease_scores.get(neighbor, 0) + 1

        # If too few direct, use personalized PageRank
        if len(disease_scores) < 3 and symptoms:
            sym_nodes = [s for s in symptoms if s in self.graph]
            if sym_nodes:
                pers = {node: 1.0 for node in sym_nodes}
                pr = nx.pagerank(self.graph, personalization=pers, alpha=0.85)
                # Filter to diseases
                for node, score in pr.items():
                    if self.graph.nodes[node].get('type') == 'disease':
                        disease_scores[node] = disease_scores.get(node, 0) + score * 10  # weight

        # Sort descending
        sorted_diseases = sorted(disease_scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_diseases[:max_results]

    def get_rare_symptoms(self) -> set:
        """Return a set of symptom names that are considered rare (e.g., low frequency)."""
        # Simplified: all symptoms in graph are considered rare (since from Orphanet)
        return {node for node, data in self.graph.nodes(data=True) if data.get('type') == 'symptom'}