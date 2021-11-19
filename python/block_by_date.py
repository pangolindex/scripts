import json, requests, os

from typing import Any, Dict

KEY = "ckey_647796b3d79a419d8f5ef816f8d"
URL = "https://api.covalenthq.com/v1/43114/block_v2/{0}/{1}/?key="+KEY+"&page-size=1000&page-number={2}"

def main():
    print("Examples: 2021-11-15 or 2021-11-15T03:36:50z")
    start_date = input("Please enter the start date (yyyy-MM-ddTHH:mm:ssZ): ")
    last_date = input("Please enter the last date (yyyy-MM-ddTHH:mm:ssZ): ")
    total_query = int(input("Enter with:\n0 - (for get first block) \n1 - (for get last block) \n"))

    geturl = URL.format(start_date, last_date, 0)
    response = requests.get(geturl)

    data = response.json()
    if response.status_code != 200:
        print(f"Error in fetch covalent api, status code: {response.status_code}")
        if "error_message" in data:
            print(data["error_message"])
        return

    items = data["data"]["items"] # list of blocks

    if len(items) == 0:
        print("No blocks were found")
        return

    if total_query == 0:
        # Get first block from data range
        block = items[0]["height"]
        date = items[0]["signed_at"]
        print(f"Block number: {block} \nDate: {date}")
    elif total_query == 1:
        #Get last block from data range
        #If exist more pages, get the last page and get last item from list
        if data["data"]["pagination"]["has_more"]:
            #Get last page
            total_page = int(int(data["data"]["pagination"]["total_count"]) / 1000)
            geturl = URL.format(start_date, last_date, total_page)
            response = requests.get(geturl)
            data = response.json()
            items = data["data"]["items"]
            #Get last block
            block = items[-1]["height"]
            date = items[-1]["signed_at"]
            print(f"Block number: {block} \nDate: {date}")
            return
        #If not exist more pages, get the last item from list
        block = items[-1]["height"]
        date = items[-1]["signed_at"]
        print(f"Block number: {block} \nDate: {date}")
    else:
        print(f"Error param : '{total_query}' is not recognized")
    return

if __name__ == "__main__":
    main()
