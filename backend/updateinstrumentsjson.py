import requests

url = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"

def update_instruments():
    res = requests.get(url)
    
    with open("backend/instruments.json", "wb") as f:
        f.write(res.content)

    print("✅ Instruments updated")