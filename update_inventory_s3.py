#!/usr/bin/env python3
import json, urllib.parse

def main():
    with open("data_file_inventory.json", "r") as f:
        inventory = json.load(f)
    
    s3_base = "https://swift-ag-platform.s3.eu-west-1.amazonaws.com/media/kjet"
    
    for app_id, app_data in inventory.items():
        for file_info in app_data["files"]:
            path = file_info["absolute_path"]
            if path.startswith("data/"):
                s3_path = path[5:]
                s3_url = f"{s3_base}/{urllib.parse.quote_plus(s3_path)}"
                file_info["s3_url"] = s3_url
    
    with open("data_file_inventory.json", "w") as f:
        json.dump(inventory, f, indent=2, ensure_ascii=False)
    
    print("✅ S3 URLs added to inventory")

if __name__ == "__main__":
    main()
