import json
import networkx as nx
import xml.etree.ElementTree as ET
from urllib.request import urlopen
import joblib
import os

class KnowledgeGraph:
    """
    Builds a graph from Orphanet XML (rare diseases, symptoms, genes).
    Uses a synonym file to map HPO symptoms to our 401 symptom names.
    """
    def __init__(self, json_path=None, synonym_path=None, cache_path='kg_cache.pkl'):
        self.graph = nx.Graph()
        self.synonym_map = {}
        if synonym_path and os.path.exists(synonym_path):
            with open(synonym_path) as f:
                self.synonym_map = json.load(f)  # e.g., {"HP:0001250": "seizure", ...}
        if json_path and os.path.exists(json_path):
            self.load_from_json(json_path)
        elif cache_path and os.path.exists(cache_path):
            self.graph = joblib.load(cache_path)
        else:
            self.build_from_orphanet()
            joblib.dump(self.graph, cache_path)

    def build_from_orphanet(self):
        """Download en_product1.xml and build graph."""
        url = "http://www.orphadata.org/data/xml/en_product1.xml"
        print("Downloading Orphanet XML...")
        response = urlopen(url)
        tree = ET.parse(response)
        root = tree.getroot()

        # Namespace
        ns = {'orph': 'http://www.orphadata.org/data/schemas'}

        # Iterate disorders
        for disorder in root.findall('.//orph:Disorder', ns):
            disease_id = disorder.find('orph:OrphaCode', ns).text
            disease_name = disorder.find('orph:Name', ns).text
            self.graph.add_node(disease_name, type='disease', orpha_code=disease_id)

            # Symptoms (HPO)
            for symptom in disorder.findall('.//orph:HPODisorderAssociation/orph:HPO', ns):
                hpo_id = symptom.find('orph:HPOId', ns).text
                hpo_term = symptom.find('orph:HPOTerm', ns).text
                # Map to our symptom names if possible
                mapped = self.synonym_map.get(hpo_id, hpo_term.lower())
                self.graph.add_node(mapped, type='symptom', hpo_id=hpo_id)
                self.graph.add_edge(disease_name, mapped, relation='symptom_of')

            # Genes
            for gene in disorder.findall('.//orph:GeneList/orph:Gene', ns):
                gene_name = gene.find('orph:Name', ns).text
                self.graph.add_node(gene_name, type='gene')
                self.graph.add_edge(disease_name, gene_name, relation='caused_by')

        print(f"Graph built: {self.graph.number_of_nodes()} nodes, {self.graph.number_of_edges()} edges")

    def load_from_json(self, json_path):
        with open(json_path, 'r') as f:
            data = json.load(f)
        for node in data.get('nodes', []):
            self.graph.add_node(node['id'], **node['attrs'])
        for edge in data.get('edges', []):
            self.graph.add_edge(edge['source'], edge['target'], **edge['attrs'])

    def get_related_diseases(self, symptoms, max_results=10):
        """
        Given a list of symptom names, return diseases with scores.
        Score = number of direct symptom matches + weighted sum from multi‑hop (PageRank).
        """
        disease_scores = {}
        # First, direct matches
        for sym in symptoms:
            if sym not in self.graph:
                continue
            for neighbor in self.graph.neighbors(sym):
                if self.graph.nodes[neighbor].get('type') == 'disease':
                    disease_scores[neighbor] = disease_scores.get(neighbor, 0) + 1

        # If no direct matches, use personalized PageRank from symptom nodes
        if not disease_scores and symptoms:
            # Use a set of symptom nodes present in graph
            sym_nodes = [s for s in symptoms if s in self.graph]
            if sym_nodes:
                # Run personalized PageRank
                pers = {node: 1.0 for node in sym_nodes}
                pr = nx.pagerank(self.graph, personalization=pers, alpha=0.85)
                # Filter to diseases and sort
                disease_scores = {node: pr[node] for node in pr if self.graph.nodes[node].get('type') == 'disease'}

        # Normalize and return top max_results
        sorted_diseases = sorted(disease_scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_diseases[:max_results]