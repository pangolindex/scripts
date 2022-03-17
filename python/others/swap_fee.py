import dash, sys

from decimal import Decimal
from dash import dcc, html
from dash.dependencies import Input, Output
from datetime import datetime
import pandas as pd
import plotly.express as px

from src.utils.graph import Graph

app = dash.Dash(__name__)

df_day = None
df_month = None
def refresh_dataframe():
    global df_day
    global df_month
    # Query day volume and date in pangolin subgraph
    graph = Graph("https://api.thegraph.com/subgraphs/name/pangolindex/exchange")
    querystr = """
    {
        data: pangolinDayDatas(first: 1000){
            date
            dailyVolumeUSD
        }
    }
    """
    results = graph.query(querystr)

    # Generate pandas dataframe 
    day_data = {"date": [], "volume": []}
    for result in results["data"]:
        day_data["date"].append(datetime.utcfromtimestamp(result["date"]))
        day_data["volume"].append(Decimal(result["dailyVolumeUSD"])*Decimal(0.0005))
    df_day = pd.DataFrame(day_data)

    # Sum all days of each month to get swap fee of each month
    df_month = df_day.groupby(df_day['date'].dt.strftime('%m-%Y'))['volume'].sum().reset_index()
    # Convert to datetime date collumn
    df_month['date'] = pd.to_datetime(df_month['date'])
    df_month = df_month.sort_values(by="date")

# Start dataframe with dataframe of days
df = df_day

app.layout = html.Div([
    dcc.Dropdown(
        id="period",
        options=[{"label": "day", "value": 0},
                 {"label": "month", "value": 1}],
        value=0,
        clearable=False,
    ),
    dcc.Graph(id="time-series-chart"),
    html.Div(
        [
            html.Button("Export data to csv", id="btn-download-csv"),
        ],
        style = {
            'display': "flex",
            'marginTop': 25,
        }
    ),
    dcc.Download(id="download-csv"),
])

@app.callback(
    Output("time-series-chart", "figure"),
    [Input("period", "value")])
def display_time_series(period):
    global df
    refresh_dataframe()
    df = df_day if period == 0 else df_month
    fig = px.line(df, x='date', y="volume")
    fig.update_layout(yaxis_tickprefix = '$', yaxis_tickformat = ',.2f')
    return fig

@app.callback(
    Output("download-csv", "data"),
    Input("btn-download-csv", "n_clicks"),
    prevent_initial_call=True,
)
def func(n_clicks):
    return dict(content=df.to_csv(index=False), filename="data.csv")

app.run_server(debug=True)