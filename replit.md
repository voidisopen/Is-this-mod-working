# Minecraft Mod Analyzer

## Overview

This is a web-based Minecraft mod compatibility analyzer built with Flask. The application allows users to upload Minecraft mod JAR files and check their compatibility with Quilt 1.21. The system analyzes mod metadata and provides detailed compatibility reports.

**Status**: Fully functional and tested with user's JAR files. Successfully analyzing mod compatibility with real-time results.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology**: Vanilla JavaScript with Bootstrap 5 (dark theme)
- **Pattern**: Single Page Application (SPA) with dynamic content loading
- **UI Framework**: Bootstrap 5 with custom CSS for enhanced user experience
- **File Processing**: Client-side JAR file analysis using JSZip library
- **Icons**: Font Awesome for visual elements

### Backend Architecture
- **Framework**: Flask (Python web framework)
- **Pattern**: RESTful API with server-side rendering for the main page
- **Session Management**: Flask sessions with configurable secret key
- **Logging**: Python's built-in logging module for debugging

### Data Storage
- **Current State**: In-memory data storage (no persistent database)
- **Mod Database**: Hardcoded mod information served via API endpoints
- **Future Consideration**: Ready for database integration (likely Postgres with Drizzle ORM)

## Key Components

### Backend Components
1. **Flask Application** (`app.py`)
   - Main application entry point with route definitions
   - Serves static content and API endpoints
   - Configurable session secret via environment variables

2. **API Endpoints**
   - `/` - Main page serving the analyzer interface
   - `/api/mod-info` - Returns known mod compatibility data

3. **Known Mods Database**
   - Currently hardcoded JSON structure
   - Contains mod metadata including compatibility versions, requirements, and download links

### Frontend Components
1. **Main Interface** (`templates/index.html`)
   - File upload area with drag-and-drop functionality
   - Bootstrap-based responsive design
   - Integration points for mod analysis results

2. **Mod Analyzer Class** (`static/js/mod-analyzer.js`)
   - Handles file upload and processing
   - Client-side JAR file analysis
   - Progress tracking and results display
   - Report export functionality

3. **Styling** (`static/css/custom.css`)
   - Custom styles for enhanced user experience
   - Hover effects and transitions
   - Status-specific visual indicators

## Data Flow

1. **File Upload**: Users drag-and-drop or browse for JAR files
2. **Client-side Processing**: JavaScript analyzes JAR files using JSZip
3. **Compatibility Checking**: Mod metadata is compared against known compatibility rules
4. **Results Display**: Compatibility status is shown with detailed information
5. **Report Generation**: Users can export analysis reports

## External Dependencies

### Frontend Libraries
- **Bootstrap 5**: UI framework with dark theme variant
- **Font Awesome 6**: Icon library for visual elements
- **JSZip 3.10.1**: Client-side ZIP/JAR file processing

### Backend Dependencies
- **Flask**: Web framework for Python
- **Standard Python Libraries**: os, logging for basic functionality

### CDN Resources
- Bootstrap CSS served from Replit CDN
- Font Awesome and JSZip served from public CDNs

## Deployment Strategy

### Current Setup
- **Environment**: Designed for Replit deployment
- **Port Configuration**: Runs on port 5000 with host 0.0.0.0
- **Development Mode**: Debug mode enabled for development
- **Static Assets**: Served directly by Flask

### Environment Configuration
- **Session Secret**: Configurable via `SESSION_SECRET` environment variable
- **Fallback Values**: Development defaults for local testing

### Scalability Considerations
- **Database Ready**: Architecture supports future database integration
- **API Extensible**: RESTful design allows for easy endpoint expansion
- **Client-side Processing**: Reduces server load by handling file analysis in browser

## Architecture Decisions

### Client-side File Processing
- **Problem**: Need to analyze JAR files without server storage
- **Solution**: Use JSZip to parse files in the browser
- **Rationale**: Reduces server load and provides immediate feedback
- **Trade-off**: Limited by browser memory for large files

### Hardcoded Mod Database
- **Problem**: Need mod compatibility information
- **Solution**: JSON structure in Python code
- **Rationale**: Simple implementation for MVP
- **Future**: Ready for database migration when scaling

### Flask Framework Choice
- **Problem**: Need simple web framework for Python
- **Solution**: Flask with minimal dependencies
- **Rationale**: Lightweight, easy to deploy, good for prototypes
- **Alternatives**: Django (too heavy), FastAPI (overkill for this use case)

### Bootstrap Dark Theme
- **Problem**: Need modern, professional UI
- **Solution**: Bootstrap 5 with Replit's dark theme
- **Rationale**: Consistent with development environment, good UX
- **Benefits**: Responsive design, accessibility features built-in