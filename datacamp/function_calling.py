import json
from openai import OpenAI
client = OpenAI()
def get_airport_info(code):
    # Dummy function to simulate fetching airport info
    airport_data = {
        "JFK": "John F. Kennedy International Airport, New York, USA",
        "LAX": "Los Angeles International Airport, Los Angeles, USA",
        "ORD": "O'Hare International Airport, Chicago, USA"
    }
    return airport_data.get(code, "Airport code not found.")    

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "user",
            "content": "Can you provide information about the airport with code JFK?"
        }
    ],
    tools=[
        {
            "name": "get_airport_info",
            "description": "Fetches information about an airport given its IATA code.",
            "parameters": {
                "type": "object",
                "properties": {
                    "airport code": {
                        "type": "string",
                        "description": "The IATA code of the airport."
                    }
                },
                "required": ["airport code"]
            }
        }
    ],
    tool_call="auto"
)
if response.choices[0].finish_reason=='tool_calls':
  function_call = response.choices[0].message.tool_calls[0].function
  # Check function name
  if response.choices[0].finish_reason=='tool_calls':
    # Extract airport code
    code = json.loads(function_call.arguments)["airport code"]
    airport_info = get_airport_info(code)
    print(airport_info)
  else:
    print("Apologies, I couldn't find any airport.")
else: 
  print("I am sorry, but I could not understand your request.")