#!/usr/bin/env python3

from app import app


if __name__ == "__main__":
    print("Starting Netly backend on http://localhost:5002")
    app.run(host="0.0.0.0", port=5002, debug=True)
