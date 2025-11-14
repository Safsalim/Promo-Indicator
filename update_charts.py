#!/usr/bin/env python3
import re

with open('/home/engine/project/frontend/public/app.js', 'r') as f:
    content = f.read()

# Add themeColors declaration before each chart creation
patterns = [
    (r'(  const ctx = document\.getElementById\(\'viewsChart\'\)\.getContext\(\'2d\'\);)', 
     r'  const themeColors = getThemeColors();\n  \n\1'),
    (r'(  const ctx = document\.getElementById\(\'rsiChart\'\)\.getContext\(\'2d\'\);)', 
     r'  const themeColors = getThemeColors();\n\n\1'),
    (r'(  const ctx = document\.getElementById\(\'btcChart\'\)\.getContext\(\'2d\'\);)', 
     r'  const themeColors = getThemeColors();\n\n\1'),
    (r'(  const ctx = document\.getElementById\(\'fngChart\'\)\.getContext\(\'2d\'\);)', 
     r'  const themeColors = getThemeColors();\n\n\1'),
    (r'(  const ctx = document\.getElementById\(\'vsiChart\'\)\.getContext\(\'2d\'\);)', 
     r'  const themeColors = getThemeColors();\n\n\1'),
]

# Apply patterns
for pattern, replacement in patterns:
    content = re.sub(pattern, replacement, content)

# Update legend labels to include color
content = re.sub(
    r'(labels: \{[^}]*usePointStyle: true,[^}]*padding: 15,[^}]*font: \{[^}]*size: 12,[^}]*weight: [\'"]500[\'"])',
    r'\1,\n            color: themeColors.textColor',
    content
)

# Update tooltip backgroundColor
content = re.sub(
    r'backgroundColor: [\'"]rgba\(0, 0, 0, 0\.8\)[\'"]',
    r'backgroundColor: themeColors.tooltipBg',
    content
)

# Update grid colors for y-axis
content = re.sub(
    r'grid: \{\s*color: [\'"]rgba\(0, 0, 0, 0\.05\)[\'"]',
    r'grid: {\n            color: themeColors.gridColor',
    content
)

# Update ticks color for axes
content = re.sub(
    r'(ticks: \{[^}]*)(font: \{[^}]*\})',
    r'\1\2,\n            color: themeColors.textColor',
    content
)

with open('/home/engine/project/frontend/public/app.js', 'w') as f:
    f.write(content)

print("Charts updated successfully!")
