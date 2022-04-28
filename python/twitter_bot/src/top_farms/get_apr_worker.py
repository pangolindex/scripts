import requests
from queue import Queue
from threading import Thread

from src.top_farms.type import APRData
class Worker(Thread):
    def __init__(self, queue: Queue):
        Thread.__init__(self)

        self.queue = queue

        self.results: list[APRData] | None = None

    def run(self):
        """
            content : dict{
                args: list[any]
                kargs: dict[string, any]
            }
        """
        while not (self.queue.empty()):
            pid = self.queue.get()
            try:
                response = requests.get(f'https://api.pangolin.exchange/pangolin/apr2/{pid}')
                result = response.json()
                if self.results is None:
                    self.results = [{
                        'pid': pid,
                        'apr': result 
                    }]
                else:
                    self.results.append({
                        'pid': pid,
                        'apr': result 
                    })
            except Exception as e:
                print(e)

            self.queue.task_done()
