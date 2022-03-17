import requests
from queue import Queue
from threading import Thread

class Worker(Thread):
    def __init__(self, queue: Queue):
        Thread.__init__(self)

        self.queue = queue

        self.results = None

    def run(self):
        """
            content : dict{
                args: list[any]
                kargs: dict[string, any]
            }
        """
        while True:
            if(self.queue.empty()):
                break

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
                    self.results.append(
                        {
                        'pid': pid,
                        'apr': result 
                    })
            except Exception as e:
                print(e)

            self.queue.task_done()
