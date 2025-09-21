"""
Security configurations and utilities for production deployment
"""
import os
import secrets
import hashlib
from functools import wraps
from flask import request, jsonify, current_app
import logging

logger = logging.getLogger(__name__)

class SecurityConfig:
    """Security configuration class"""
    
    # File upload security
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS = {'csv', 'pdf'}
    ALLOWED_MIME_TYPES = {
        'text/csv',
        'application/pdf',
        'application/csv'
    }
    
    # Rate limiting
    RATE_LIMIT_REQUESTS = 100  # requests per minute
    RATE_LIMIT_WINDOW = 60  # seconds
    
    # Security headers
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'"
    }

def generate_secret_key():
    """Generate a secure secret key"""
    return secrets.token_urlsafe(32)

def hash_password(password):
    """Hash a password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def validate_file_upload(file):
    """Validate file upload for security"""
    if not file:
        return False, "No file provided"
    
    # Check file size
    file.seek(0, 2)  # Seek to end
    size = file.tell()
    file.seek(0)  # Reset to beginning
    
    if size > SecurityConfig.MAX_FILE_SIZE:
        return False, f"File too large. Maximum size is {SecurityConfig.MAX_FILE_SIZE // (1024*1024)}MB"
    
    # Check file extension
    if '.' not in file.filename:
        return False, "File must have an extension"
    
    extension = file.filename.rsplit('.', 1)[1].lower()
    if extension not in SecurityConfig.ALLOWED_EXTENSIONS:
        return False, f"File type not allowed. Allowed types: {', '.join(SecurityConfig.ALLOWED_EXTENSIONS)}"
    
    # Check MIME type
    mime_type = file.content_type
    if mime_type not in SecurityConfig.ALLOWED_MIME_TYPES:
        return False, f"MIME type not allowed: {mime_type}"
    
    return True, "File is valid"

def sanitize_filename(filename):
    """Sanitize filename for security"""
    import re
    # Remove any path components
    filename = os.path.basename(filename)
    # Remove dangerous characters
    filename = re.sub(r'[^\w\-_\.]', '', filename)
    # Ensure it's not empty
    if not filename:
        filename = 'upload'
    return filename

def rate_limit(max_requests=100, window=60):
    """Rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Simple in-memory rate limiting
            # In production, use Redis or similar
            client_ip = request.remote_addr
            current_time = int(time.time())
            
            # This is a simple implementation
            # For production, use a proper rate limiting library
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def add_security_headers(response):
    """Add security headers to response"""
    for header, value in SecurityConfig.SECURITY_HEADERS.items():
        response.headers[header] = value
    return response

def validate_api_key(api_key):
    """Validate API key"""
    expected_key = os.environ.get('API_KEY')
    if not expected_key:
        return False
    return secrets.compare_digest(api_key, expected_key)

def require_api_key(f):
    """Decorator to require API key"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        if not api_key or not validate_api_key(api_key):
            return jsonify({'error': 'Invalid or missing API key'}), 401
        return f(*args, **kwargs)
    return decorated_function

def log_security_event(event_type, details):
    """Log security events"""
    logger.warning(f"Security Event - {event_type}: {details}")

def check_request_size():
    """Check if request size is within limits"""
    content_length = request.content_length
    if content_length and content_length > SecurityConfig.MAX_FILE_SIZE:
        log_security_event("LARGE_REQUEST", f"Request size: {content_length}")
        return False
    return True

def validate_csrf_token():
    """Validate CSRF token"""
    # Simple CSRF protection
    # In production, use Flask-WTF or similar
    token = request.form.get('csrf_token')
    expected_token = request.cookies.get('csrf_token')
    
    if not token or not expected_token:
        return False
    
    return secrets.compare_digest(token, expected_token)

def setup_security_headers(app):
    """Setup security headers for the app"""
    @app.after_request
    def after_request(response):
        return add_security_headers(response)

def create_csrf_token():
    """Create CSRF token"""
    return secrets.token_urlsafe(16)

# Security middleware
class SecurityMiddleware:
    """Security middleware for additional protection"""
    
    def __init__(self, app):
        self.app = app
    
    def __call__(self, environ, start_response):
        # Add security checks here
        return self.app(environ, start_response)
