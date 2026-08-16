"""
Scrapling Service - Web Scraping Microservice

This service wraps the Scrapling library to provide web scraping capabilities
for the USAMKO platform through a simple HTTP API.

Installation:
    pip install "scrapling[fetchers]" fastapi uvicorn pydantic

Usage:
    uvicorn scrapling_service:app --host 0.0.0.0 --port 8001
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="Scrapling Service",
    description="Web scraping microservice powered by Scrapling",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FetcherType(str, Enum):
    STANDARD = "standard"
    STEALTH = "stealth"
    DYNAMIC = "dynamic"


class ScrapeRequest(BaseModel):
    url: str = Field(..., description="URL to scrape")
    fetcher_type: FetcherType = Field(
        default=FetcherType.STEALTH,
        description="Type of fetcher to use"
    )
    css_selectors: Optional[Dict[str, str]] = Field(
        default=None,
        description="CSS selectors to extract data (field_name: selector)"
    )
    xpath_selectors: Optional[Dict[str, str]] = Field(
        default=None,
        description="XPath selectors to extract data (field_name: selector)"
    )
    extract_all_links: bool = Field(
        default=False,
        description="Extract all links from the page"
    )
    extract_images: bool = Field(
        default=False,
        description="Extract all images from the page"
    )
    headless: bool = Field(
        default=True,
        description="Run browser in headless mode (dynamic only)"
    )
    wait_for_network_idle: bool = Field(
        default=True,
        description="Wait for network idle (dynamic only)"
    )
    timeout: int = Field(
        default=30,
        description="Request timeout in seconds"
    )
    proxy: Optional[str] = Field(
        default=None,
        description="Proxy URL (e.g., http://user:pass@host:port)"
    )


class ScrapeResponse(BaseModel):
    success: bool
    url: str
    data: Dict[str, Any]
    raw_html: Optional[str] = None
    error: Optional[str] = None
    execution_time: float


class CrawlRequest(BaseModel):
    start_urls: List[str] = Field(..., description="Starting URLs for crawl")
    max_pages: int = Field(default=100, description="Maximum pages to crawl")
    max_depth: int = Field(default=3, description="Maximum crawl depth")
    allowed_domains: Optional[List[str]] = Field(
        default=None,
        description="List of allowed domains"
    )
    css_selectors: Optional[Dict[str, str]] = Field(
        default=None,
        description="CSS selectors to extract from each page"
    )
    follow_links: bool = Field(
        default=True,
        description="Follow links found on pages"
    )


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Scrapling Service",
        "status": "healthy",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        # Try importing scrapling
        import scrapling
        return {
            "status": "healthy",
            "scrapling_available": True,
            "scrapling_version": scrapling.__version__ if hasattr(scrapling, '__version__') else "unknown"
        }
    except ImportError:
        return {
            "status": "degraded",
            "scrapling_available": False,
            "error": "Scrapling library not installed"
        }


@app.post("/scrape", response_model=ScrapeResponse)
async def scrape_url(request: ScrapeRequest):
    """
    Scrape a single URL using Scrapling
    """
    import time
    start_time = time.time()

    try:
        # Import Scrapling components
        try:
            if request.fetcher_type == FetcherType.STANDARD:
                from scrapling import Fetcher as FetcherClass
            elif request.fetcher_type == FetcherType.STEALTH:
                from scrapling import StealthyFetcher as FetcherClass
            else:  # DYNAMIC
                from scrapling import DynamicFetcher as FetcherClass
        except ImportError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Scrapling not installed. Run: pip install scrapling[fetchers]"
            )

        # Prepare fetch options
        fetch_options = {}
        if request.proxy:
            fetch_options['proxy'] = request.proxy
        if request.fetcher_type == FetcherType.DYNAMIC:
            fetch_options['headless'] = request.headless
            fetch_options['network_idle'] = request.wait_for_network_idle

        # Fetch the page
        logger.info(f"Fetching URL: {request.url} with {request.fetcher_type}")
        page = FetcherClass.fetch(request.url, **fetch_options)

        # Extract data
        data = {}

        # Extract using CSS selectors
        if request.css_selectors:
            for field_name, selector in request.css_selectors.items():
                elements = page.css(selector)
                if elements:
                    # Get text from all matching elements
                    texts = [elem.text for elem in elements if hasattr(elem, 'text')]
                    data[field_name] = texts if len(texts) > 1 else texts[0] if texts else None
                else:
                    data[field_name] = None

        # Extract using XPath selectors
        if request.xpath_selectors:
            for field_name, xpath in request.xpath_selectors.items():
                elements = page.xpath(xpath)
                if elements:
                    texts = [elem.text for elem in elements if hasattr(elem, 'text')]
                    data[field_name] = texts if len(texts) > 1 else texts[0] if texts else None
                else:
                    data[field_name] = None

        # Extract all links
        if request.extract_all_links:
            links = []
            for link in page.css('a'):
                href = link.attrib.get('href')
                if href:
                    links.append({
                        'url': href,
                        'text': link.text if hasattr(link, 'text') else ''
                    })
            data['links'] = links

        # Extract all images
        if request.extract_images:
            images = []
            for img in page.css('img'):
                src = img.attrib.get('src')
                if src:
                    images.append({
                        'url': src,
                        'alt': img.attrib.get('alt', '')
                    })
            data['images'] = images

        execution_time = time.time() - start_time

        logger.info(f"Successfully scraped {request.url} in {execution_time:.2f}s")

        return ScrapeResponse(
            success=True,
            url=request.url,
            data=data,
            raw_html=str(page) if len(str(page)) < 100000 else None,  # Limit raw HTML size
            execution_time=execution_time
        )

    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(f"Scraping failed for {request.url}: {str(e)}")

        return ScrapeResponse(
            success=False,
            url=request.url,
            data={},
            error=str(e),
            execution_time=execution_time
        )


@app.post("/extract/profiles")
async def extract_profiles(request: ScrapeRequest):
    """
    Extract profile information from a page
    Automatically detects and extracts common profile fields
    """
    # Define common profile selectors
    profile_selectors = {
        'name': 'h1, .name, [class*="name"], [itemprop="name"]',
        'title': '.title, [class*="title"], [class*="headline"]',
        'company': '.company, [class*="company"], [itemprop="worksFor"]',
        'location': '.location, [class*="location"], [itemprop="address"]',
        'bio': '.bio, .summary, [class*="summary"], [class*="about"]',
        'email': 'a[href^="mailto:"]',
        'phone': 'a[href^="tel:"]',
        'social_links': 'a[href*="linkedin"], a[href*="twitter"], a[href*="facebook"]',
    }

    request.css_selectors = profile_selectors
    return await scrape_url(request)


@app.post("/extract/contacts")
async def extract_contacts(request: ScrapeRequest):
    """
    Extract contact information from a page
    """
    contact_selectors = {
        'emails': 'a[href^="mailto:"]',
        'phones': 'a[href^="tel:"]',
        'addresses': '[itemprop="address"], .address, [class*="address"]',
        'social_media': 'a[href*="linkedin"], a[href*="twitter"], a[href*="facebook"], a[href*="instagram"]',
    }

    request.css_selectors = contact_selectors
    request.extract_all_links = True
    return await scrape_url(request)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
