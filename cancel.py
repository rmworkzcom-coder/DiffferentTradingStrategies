import os
from dotenv import load_dotenv
from alpaca.trading.client import TradingClient
load_dotenv(".env.local")
api_key = os.getenv("ALPACA_KEY")
secret_key = os.getenv("ALPACA_SECRET")
client = TradingClient(api_key, secret_key, paper=False)
print(client.cancel_orders())
