 
import json
import networkx as nx
import xml.etree.ElementTree as ET
from urllib.request import urlopen

class KnowledgeGraph:
    """
    Builds a graph from Orphanet XML (rare diseases, symptoms, genes).
    For demo, we may load a pre‑built JSON.
    """
    def __init__(self, json_path=None):
        self.graph = nx.Graph()
        if json_path:
            self.load_from_json(json_path)
        else:
            self.build_from_orphanet()

    def build_from_orphanet(self):
        """
        Fetch Orphanet XML and build nodes/edges.
        This is a placeholder – actual implementation would parse the XML.
        """
        # Example: download and parse
        # url = "http://www.orphadata.org/data/xml/en_product1.xml"
        # response = urlopen(url)
        # tree = ET.parse(response)
        # root = tree.getroot()
        # ... build nodes ...
        # For now, we'll create a small demo graph
        self.graph.add_node('fever', type='symptom')
        self.graph.add_node('cough', type='symptom')
        self.graph.add_node('Malaria', type='disease')
        self.graph.add_edge('Malaria', 'fever', relation='symptom_of')
        self.graph.add_edge('Malaria', 'cough', relation='symptom_of')
        print("Knowledge graph built (demo).")

    def load_from_json(self, json_path):
        with open(json_path, 'r') as f:
            data = json.load(f)
        for node in data.get('nodes', []):
            self.graph.add_node(node['id'], **node['attrs'])
        for edge in data.get('edges', []):
            self.graph.add_edge(edge['source'], edge['target'], **edge['attrs'])

    def get_related_diseases(self, symptoms):
        """
        Given a list of symptom names, return diseases that are connected to at least one symptom.
        Returns list of (disease, score) where score = number of matching symptoms.
        """
        disease_scores = {}
        for sym in symptoms:
            if sym not in self.graph:
                continue
            for neighbor in self.graph.neighbors(sym):
                if self.graph.nodes[neighbor].get('type') == 'disease':
                    disease_scores[neighbor] = disease_scores.get(neighbor, 0) + 1
        # Sort by score descending
        sorted_diseases = sorted(disease_scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_diseases