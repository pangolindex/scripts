from src.utils.graph import Graph

URL = 'https://api.thegraph.com/subgraphs/name/dasconnor/avalanche-blocks'

QUERY = """
query blocks($timestampFrom: Int!) {
    blocks(
      first: 1
      orderBy: timestamp
      orderDirection: asc
      where: { timestamp_gte: $timestampFrom}
    ) {
      id
      number
      timestamp
    }
  }
"""

def get_block_by_timestamp(timestamp: int) -> int:
    """Get the block number by timestamp

    Args:
        timestamp (int): Timestamp

    Returns:
        int: Block number
    """
    
    graph = Graph(URL)
    
    params = {
        "timestampFrom": timestamp
    }
    
    result = graph.query(QUERY, params)
    
    return int(result["blocks"][0]["number"])
