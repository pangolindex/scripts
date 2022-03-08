import requests

from gql import Client, gql
from gql.transport.requests import RequestsHTTPTransport
from typing import Any, Dict, Optional

class Graph():

    def __init__(self, url: str, timeout: int = 20) -> None:
        self.url = url
        transport = RequestsHTTPTransport(url=url)
        self.client = Client(transport=transport, fetch_schema_from_transport=False, execute_timeout=timeout)

    def query(
            self,
            querystr: str,
            param_values: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        # Query any the Graph api

        try:
            result = self.client.execute(gql(querystr), variable_values=param_values)
        except (requests.exceptions.RequestException, Exception) as e:
            print(f'Error in fetch graph api.\nerror: {e}\nurl: {self.url}\nQuery: {querystr}')
            return

        return result
