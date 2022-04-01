from prompt_toolkit.document import Document
from prompt_toolkit.widgets import TextArea, ProgressBar, Label
from prompt_toolkit.layout.controls import FormattedTextControl
from queue import Queue
from threading import Thread
from web3 import Web3
from web3.eth import Contract

from src.database.database import Database

class BaseWoker(Thread):
    def __init__(
        self,
        category: str,
        airdrop_id: str,
        queue: Queue,
        interval: int,
        last_block: int,
        contract: Contract | list[Contract],
        web3: Web3,
        database: Database,
        progressbar: ProgressBar,
        textarea: TextArea,
        label: FormattedTextControl
    ) -> None:
        Thread.__init__(self)
        self.daemon = True
        self.category = category
        self.airdrop_id = airdrop_id
        self.queue = queue
        self.interval = interval
        self.last_block = last_block
        self.database = database
        self.contract = contract
        self.web3 = web3
        self.progressbar = progressbar
        self.textarea = textarea
        self.label = label

        self.range = range
        self.count_tx_png_holders: int = 0

        self.stopped = True
        self.finished = False

        self.workers = None
        self.app = None
    
    def stop(self) -> None:
        self.stopped = True
    
    def add_message(self, message: str) -> None:
        new_text = self.textarea.text + "\n" + message

        # Add text to textarea buffer.
        self.textarea.buffer.document = Document(
            text=new_text, cursor_position=len(new_text)
        )
        
    def update_progress_bar(self, block: int) -> None:
        percentage = block * 100  / self.last_block
        if self.progressbar.percentage < percentage:
            self.progressbar.percentage = percentage
            self.label.text = f" Block: {block} / {self.last_block} {percentage:.2f}%"

    def stop_app(self) -> None:
        if self.workers is None:
            return

        all_finished = all(worker.finished for worker in self.workers)
        if all_finished:
            self.app.exit()
