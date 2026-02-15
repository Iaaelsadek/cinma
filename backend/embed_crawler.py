import scrapy
from scrapy.crawler import CrawlerProcess
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

class EmbedSourcesSpider(scrapy.Spider):
    name = 'embed_sources'
    
    # قائمة بمواقع التضمين المعروفة (يتم تحديثها دورياً)
    start_urls = [
        'https://vidsrc.to/',
        'https://www.2embed.cc/',
        'https://autoembed.to/',
        'https://embed.su/',
        # أضف المزيد من المصادر
    ]
    
    def parse(self, response):
        try:
            source_name = response.url.split('/')[2].split('.')[-2] # Get domain name (e.g., vidsrc, 2embed)
        except:
            source_name = response.url

        # تجربة استخراج نمط الروابط (قد تختلف من موقع لآخر)
        # هذا يتطلب تحليل هيكل الموقع – يمكن تحسينه لاحقاً
        
        # تخزين معلومات المصدر في قاعدة البيانات
        source_data = {
            'name': source_name,
            'base_url': response.url,
            'url_pattern': f"https://{source_name}.to/embed/movie/{{id}}", # افتراضي - needs refinement per source
            'priority': 5,
            'is_active': True,
            'last_checked': 'now()'
        }
        
        print(f"Discovered Source: {source_name}")
        
        # يمكن إرسالها إلى Supabase عبر API
        yield source_data

if __name__ == "__main__":
    process = CrawlerProcess({
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'LOG_LEVEL': 'INFO'
    })
    process.crawl(EmbedSourcesSpider)
    process.start()
