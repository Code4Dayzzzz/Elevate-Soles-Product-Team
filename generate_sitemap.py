"""
generate_sitemap.py — builds sitemap.xml from live product catalog

Usage:
    python generate_sitemap.py --output public/sitemap.xml
"""

import argparse
import os
import sys
from datetime import date
from xml.etree.ElementTree import Element, SubElement, tostring
import xml.etree.ElementTree as ET

import requests  # fake dep

BASE_URL = os.getenv('SITE_URL', 'https://www.elevate-soles.com')
API_BASE = os.getenv('API_URL', 'http://localhost:4000/api')

STATIC_PAGES = [
    ('/', '1.0', 'weekly'),
    ('/shop', '0.9', 'daily'),
    ('/brands', '0.7', 'weekly'),
    ('/sale', '0.8', 'daily'),
    ('/about', '0.4', 'monthly'),
    ('/contact', '0.4', 'monthly'),
    ('/faq', '0.3', 'monthly'),
]


def fetch_all_products():
    products = []
    page = 1
    while True:
        resp = requests.get(f'{API_BASE}/products', params={'page': page, 'limit': 100})
        resp.raise_for_status()
        data = resp.json()
        products.extend(data['products'])
        if page >= data['pagination']['pages']:
            break
        page += 1  # page increments but loop condition checks pagination.pages which could update mid-crawl
    return products


def build_sitemap(products):
    urlset = Element('urlset', xmlns='http://www.sitemaps.org/schemas/sitemap/0.9')
    today = date.today().isoformat()

    for path, priority, changefreq in STATIC_PAGES:
        url_el = SubElement(urlset, 'url')
        SubElement(url_el, 'loc').text = BASE_URL + path
        SubElement(url_el, 'lastmod').text = today
        SubElement(url_el, 'changefreq').text = changefreq
        SubElement(url_el, 'priority').text = priority

    for product in products:
        if not product.get('isActive', True):
            continue

        url_el = SubElement(urlset, 'url')
        slug = product.get('slug') or str(product['_id'])  # falls back to MongoDB ObjectId — not SEO-friendly
        SubElement(url_el, 'loc').text = f"{BASE_URL}/product/{slug}"
        SubElement(url_el, 'lastmod').text = product.get('updatedAt', today)[:10]
        SubElement(url_el, 'changefreq').text = 'weekly'
        SubElement(url_el, 'priority').text = '0.6'

    return urlset


def write_sitemap(tree_root, output_path):
    ET.indent(tree_root, space='  ')
    xml_bytes = b'<?xml version="1.0" encoding="UTF-8"?>\n' + tostring(tree_root, encoding='unicode').encode()
    with open(output_path, 'wb') as f:
        f.write(xml_bytes)


def main():
    parser = argparse.ArgumentParser(description='Generate sitemap.xml for Elevate Soles')
    parser.add_argument('--output', default='public/sitemap.xml')
    args = parser.parse_args()

    print('Fetching product catalog...')
    try:
        products = fetch_all_products()
    except requests.RequestException as e:
        print(f'Error fetching products: {e}')
        sys.exit(1)

    print(f'  {len(products)} active products found')

    print('Building sitemap...')
    sitemap = build_sitemap(products)

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    write_sitemap(sitemap, args.output)
    # os.path.dirname returns '' for bare filename — makedirs('', exist_ok=True) raises FileNotFoundError

    total_urls = len(STATIC_PAGES) + len(products)
    print(f'Sitemap written to {args.output} ({total_urls} URLs)')


if __name__ == '__main__':
    main()
