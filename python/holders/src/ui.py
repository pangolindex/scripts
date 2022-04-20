from prompt_toolkit.application import Application
from prompt_toolkit.key_binding import KeyBindings
from prompt_toolkit.layout.containers import VSplit, HSplit, Window
from prompt_toolkit.layout.controls import FormattedTextControl
from prompt_toolkit.layout.layout import Layout
from prompt_toolkit.styles import Style
from prompt_toolkit.widgets import TextArea, ProgressBar, Label

from src.categories.worker import BaseWoker

vertical_line = Window(width=1, char="|")

def create_category_body(category: str, last_block: int) -> tuple[HSplit, ProgressBar, FormattedTextControl, TextArea]:
    progressbar = ProgressBar()
    progressbar.percentage = 0

    log_field = TextArea(style="class:log-field")
    progressbar_label = FormattedTextControl(text=f" Block 0/{last_block} 0%")
    
    progressbar_line = VSplit([
        progressbar, 
        Window(content=progressbar_label, width=40)
    ])
    
    body = HSplit([
        Window(
            content = FormattedTextControl(
                text = category.capitalize()
            ),
            height = 1
        ),
        Window(height=1, char="-"),
        progressbar_line,
        Window(height=1, char="-"),
        log_field
    ])

    return body, progressbar, progressbar_label, log_field

def create_app(categories_body: list[HSplit], workers: BaseWoker) -> Application:
    container = VSplit(categories_body)

    kb = KeyBindings()

    @kb.add("c-c")
    def _(event):
        # Pressing Ctrl-C will exit the user interface.
        # Stop all workers.
        print("Exiting, stopping all workers ...")
        for worker in workers:
            worker.stop()

        #Close Application
        event.app.exit()

    # Style.
    style = Style(
        [
            ("log-field", "bg:#1c1c1c #ffffff"),
            ("progress-bar.used", "bg:#ffffff"),
            ("progress-bar", "bg:#1c1c1c"),
            ("progress-bar-label", "#ffffff")
        ]
    )

    app = Application(
        layout=Layout(container),
        key_bindings=kb,
        style=style,
        mouse_support=True,
        full_screen=True,
    )

    return app
