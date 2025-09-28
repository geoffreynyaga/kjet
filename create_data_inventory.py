#!/usr/bin/env python3
"""
Create a JSON inventory of all files in the data/ directory,
keyed by application_id extracted from folder names.
"""

import os
import json
import re
import urllib.parse
import shutil

def extract_application_id(folder_name):
    """Extract application ID from folder names like 'application_396_bundle' or 'application_369_bundle (1)'"""
    match = re.search(r'application_(\d+)', folder_name)
    return match.group(1) if match else folder_name

def build_file_tree():
    """Build a tree structure of all files in the data directory"""
    tree = {}

    for root, dirs, files in os.walk('data'):
        # Skip .DS_Store and other hidden files
        files = [f for f in files if not f.startswith('.')]

        if files:  # Only include directories that have files
            # Get the relative path from data/
            rel_path = os.path.relpath(root, 'data')

            # Extract county and application info
            path_parts = rel_path.split(os.sep)
            if len(path_parts) >= 2:
                county = path_parts[0]
                application_folder = path_parts[1]
                application_id = extract_application_id(application_folder)

                if application_id not in tree:
                    tree[application_id] = {
                        'files': []
                    }

                for file in files:
                    file_path = os.path.join(root, file)
                    
                    # Generate S3 URL
                    s3_base = "https://swift-ag-platform.s3.eu-west-1.amazonaws.com/media/kjet"
                    s3_path = rel_path + os.sep + file
                    s3_url = s3_base + "/" + urllib.parse.quote_plus(s3_path).replace('%2F', '/')

                    file_info = {
                        'filename': file,
                        'absolute_path': file_path,
                        's3_url': s3_url
                    }
                    tree[application_id]['files'].append(file_info)

    return tree

def main():
    print("Building file inventory from data/ directory...")

    # Build the tree
    file_tree = build_file_tree()

    # Sort by application_id (numeric sort for IDs that are numbers)
    def sort_key(item):
        app_id = item[0]
        try:
            return int(app_id)
        except ValueError:
            return 0

    sorted_tree = dict(sorted(file_tree.items(), key=sort_key))

    # Save to JSON
    output_file = 'data_file_inventory.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(sorted_tree, f, indent=2, ensure_ascii=False)

    # Copy to code/public folder
    public_dir = 'code/public'
    os.makedirs(public_dir, exist_ok=True)
    public_file = os.path.join(public_dir, 'data_file_inventory.json')
    shutil.copy2(output_file, public_file)

    print(f"✅ Created {output_file} with {len(sorted_tree)} applications")
    print(f"📋 Also copied to {public_file}")

    # Print summary
    total_files = sum(len(data['files']) for data in sorted_tree.values())
    print(f"📁 Total applications: {len(sorted_tree)}")
    print(f"📄 Total files: {total_files}")

    # Show sample
    print("\n📋 Sample entries:")
    for i, (app_id, data) in enumerate(sorted_tree.items()):
        if i < 5:  # Show first 5
            print(f"  {app_id}: {len(data['files'])} files")
        elif i == 5:
            print("  ...")

if __name__ == "__main__":
    main()