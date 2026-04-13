#!/bin/bash
cd /Users/mac/Desktop/Websites/ttandmore/src

# Use the Chichen Itza tour as template base
TEMPLATE="chichen-itza-tour/index.html"

# Function to create a tour page
create_tour() {
  local dir="$1"
  local title="$2"
  local meta_desc="$3"
  local hero_img="$4"
  local description="$5"
  local includes="$6"
  local gallery_img1="$7"
  local gallery_img2="$8"
  local related1_url="$9"
  local related1_title="${10}"
  local related1_img="${11}"
  local related2_url="${12}"
  local related2_title="${13}"
  local related2_img="${14}"
  local related3_url="${15}"
  local related3_title="${16}"
  local related3_img="${17}"
  
  mkdir -p "$dir"
  
  sed -e "s|Tour Express Chichén Itzá|${title}|g" \
      -e "s|Private guided tour to Chichén Itzá, one of the New Seven Wonders of the World. Includes transportation, professional guide, and an unforgettable experience.|${meta_desc}|g" \
      -e "s|https://ttandmore.com/chichen-itza-tour/|https://ttandmore.com/${dir}/|g" \
      -e "s|chichen-itza-tour/|${dir}/|g" \
      "$TEMPLATE" > "${dir}/index.html"
  
  echo "Created: ${dir}/index.html"
}

echo "Tour pages will be generated from template..."
echo "Done - see individual file creation below"
