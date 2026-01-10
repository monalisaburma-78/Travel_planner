"""
Enhanced PDF Generation Service for Travel Itineraries
Now with proper styling and complete trip details
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image
from reportlab.lib import colors
from datetime import datetime
import os
import json


def generate_pdf(trip_data: dict) -> str:
    """
    Generate a beautiful PDF itinerary from trip data
    Returns the filepath of the generated PDF
    """
    
    # Create PDF file
    trip_id = trip_data.get('id', trip_data.get('trip_id', 'unknown'))
    filename = f"itinerary_{trip_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    filepath = f"/tmp/{filename}"
    
    # Create document
    doc = SimpleDocTemplate(
        filepath,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18,
    )
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=colors.HexColor('#0369a1'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=18,
        textColor=colors.HexColor('#0369a1'),
        spaceAfter=12,
        spaceBefore=15,
        fontName='Helvetica-Bold'
    )
    
    day_title_style = ParagraphStyle(
        'DayTitle',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#7c3aed'),
        spaceAfter=10,
        spaceBefore=15,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=10,
        alignment=TA_JUSTIFY,
        fontName='Helvetica'
    )
    
    # Add title
    destinations = trip_data.get('destinations', [])
    if isinstance(destinations, str):
        destinations = [destinations]
    
    dest_text = ', '.join(destinations) if destinations else 'Your Journey'
    title = Paragraph(f"Travel Itinerary<br/>{dest_text}", title_style)
    elements.append(title)
    elements.append(Spacer(1, 0.3*inch))
    
    # Add trip overview
    itinerary = trip_data.get('itinerary', {})
    if isinstance(itinerary, str):
        try:
            itinerary = json.loads(itinerary)
        except:
            itinerary = {}
    
    overview = itinerary.get('overview', 'Your personalized travel experience')
    overview_para = Paragraph(overview, subtitle_style)
    elements.append(overview_para)
    elements.append(Spacer(1, 0.2*inch))
    
    # Trip Details Table
    trip_details_data = [
        ['Trip Details', ''],
        ['Dates:', f"{trip_data.get('start_date', 'N/A')} to {trip_data.get('end_date', 'N/A')}"],
        ['Trip Type:', trip_data.get('trip_type', 'N/A').title()],
        ['Generated:', datetime.now().strftime('%B %d, %Y at %I:%M %p')],
    ]
    
    trip_table = Table(trip_details_data, colWidths=[2*inch, 4*inch])
    trip_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0369a1')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f1f5f9')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 11),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ]))
    elements.append(trip_table)
    elements.append(Spacer(1, 0.4*inch))
    
    # Daily Itinerary
    elements.append(Paragraph("Daily Itinerary", heading_style))
    elements.append(Spacer(1, 0.1*inch))
    
    days = itinerary.get('days', [])
    if not days and 'raw_response' in itinerary:
        # Fallback to raw response
        elements.append(Paragraph(itinerary['raw_response'], body_style))
    else:
        for day in days:
            # Day number and title
            day_num = day.get('day', '?')
            day_title = day.get('title', f'Day {day_num}')
            day_location = day.get('location', '')
            
            title_text = f"Day {day_num}: {day_title}"
            if day_location:
                title_text += f" - {day_location}"
            
            elements.append(Paragraph(title_text, day_title_style))
            
            # Day description
            if 'description' in day:
                desc = Paragraph(day['description'], body_style)
                elements.append(desc)
                elements.append(Spacer(1, 0.1*inch))
            
            # Activities
            if 'activities' in day and day['activities']:
                elements.append(Paragraph("<b>Activities:</b>", body_style))
                for activity in day['activities']:
                    activity_text = f"• {activity}"
                    elements.append(Paragraph(activity_text, body_style))
                elements.append(Spacer(1, 0.05*inch))
            
            # Meals
            if 'meals' in day and day['meals']:
                elements.append(Paragraph("<b>Dining:</b>", body_style))
                for meal_type, meal_info in day['meals'].items():
                    meal_text = f"• {meal_type.title()}: {meal_info}"
                    elements.append(Paragraph(meal_text, body_style))
                elements.append(Spacer(1, 0.05*inch))
            
            # Accommodation
            if 'accommodation' in day:
                acc_text = f"<b>Accommodation:</b> {day['accommodation']}"
                elements.append(Paragraph(acc_text, body_style))
            
            elements.append(Spacer(1, 0.2*inch))
    
    # Budget Breakdown
    budget_breakdown = trip_data.get('budget_breakdown', {})
    if budget_breakdown and isinstance(budget_breakdown, dict):
        elements.append(PageBreak())
        elements.append(Paragraph("Budget Breakdown", heading_style))
        elements.append(Spacer(1, 0.1*inch))
        
        budget_data = [['Category', 'Total', 'Per Day', 'Percentage']]
        
        categories = ['accommodation', 'food', 'activities', 'transportation', 'miscellaneous']
        for category in categories:
            if category in budget_breakdown and isinstance(budget_breakdown[category], dict):
                cat_data = budget_breakdown[category]
                budget_data.append([
                    category.title(),
                    f"${cat_data.get('total', 0):.2f}",
                    f"${cat_data.get('per_day', 0):.2f}",
                    f"{cat_data.get('percentage', 0):.1f}%"
                ])
        
        # Add total row
        total = budget_breakdown.get('total', 0)
        per_day = budget_breakdown.get('per_person_per_day', 0)
        budget_data.append([
            'TOTAL',
            f"${total:.2f}",
            f"${per_day:.2f}",
            '100%'
        ])
        
        budget_table = Table(budget_data, colWidths=[2*inch, 1.5*inch, 1.5*inch, 1.5*inch])
        budget_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0369a1')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -2), colors.HexColor('#f1f5f9')),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#dbeafe')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
            ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ]))
        elements.append(budget_table)
    
    # Recommendations
    recommendations = trip_data.get('recommendations', {})
    if recommendations and isinstance(recommendations, dict):
        elements.append(Spacer(1, 0.3*inch))
        elements.append(Paragraph("Recommendations & Tips", heading_style))
        elements.append(Spacer(1, 0.1*inch))
        
        for key, value in recommendations.items():
            if value:
                rec_title = key.replace('_', ' ').title()
                elements.append(Paragraph(f"<b>{rec_title}:</b>", body_style))
                if isinstance(value, list):
                    for item in value:
                        elements.append(Paragraph(f"• {item}", body_style))
                else:
                    elements.append(Paragraph(str(value), body_style))
                elements.append(Spacer(1, 0.1*inch))
    
    # Footer
    elements.append(Spacer(1, 0.5*inch))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#94a3b8'),
        alignment=TA_CENTER,
    )
    footer_text = "Generated by JourneyGenius - AI-Powered Travel Planning"
    elements.append(Paragraph(footer_text, footer_style))
    
    # Build PDF
    doc.build(elements)
    
    return filepath
