import requests
import sys

API_KEY = "AIzaSyB_CszR-J3w34CWsTdjBhz-tFV8d3r06-o"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key={API_KEY}"
# Note: we use gemini-3-flash because we noticed gemini-3-flash returned 404 earlier in the Bash script. Wait, we tested:
# Testing gemini-3-flash-preview... -> 200 !
