from __future__ import annotations

import io
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Literal

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import HRFlowable, Image as PlatypusImage, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

AgreementType = Literal['merchant', 'affiliate']
CURRENT_CONTRACT_VERSION = '1.0'

CONTRACT_CONTENT: dict[AgreementType, dict[str, object]] = {
    'merchant': {
        'title': 'Affilia Merchant Agreement',
        'agreement_code': 'AFF-MER',
        'party_label': 'Merchant',
        'summary': [
            'List products, set commissions, and use Affilia escrow and receipts infrastructure.',
            'Maintain accurate listings, valid KRA and business records, and approve legitimate sales promptly.',
            'Counterfeit goods, tracking bypass, collusion, and money laundering are prohibited.',
        ],
        'sections': [
            ('1. Definitions', [
                'Platform means Affilia, owned and operated by Maridex Dev Labs.',
                'Merchant means the business listing products on Affilia.',
                'Escrow means funds held by the Platform on behalf of the Merchant.',
                'Commission means the portion of a sale owed to the promoting Affiliate.',
            ]),
            ('2. Platform Services', [
                'The Platform may list products, generate tracking links, provide analytics, hold escrow, and issue official receipts.',
                'The Platform may modify non-critical features with notice, suspend abusive accounts, and revise fee schedules with notice.',
            ]),
            ('3. Merchant Obligations', [
                'Merchants must provide accurate product information, maintain sufficient escrow, honour approved sales, and comply with Kenyan law.',
                'Prohibited conduct includes counterfeit listings, fake sales, bypassing tracking, harassment, and laundering activity.',
            ]),
            ('4. Fees and Escrow', [
                'Platform fees, deposit fees, and withdrawal fees apply and may be revised on notice.',
                'Escrow is a safeguarded platform balance, not a bank account, and unused funds may be withdrawn subject to review windows.',
            ]),
            ('5. Sales Approval and Disputes', [
                'Merchants must approve or reject legitimate sales promptly and provide a valid reason when rejecting.',
                'Disputes first go through good-faith negotiation, then mediation or arbitration in Kenya.',
            ]),
        ],
    },
    'affiliate': {
        'title': 'Affilia Affiliate Agreement',
        'agreement_code': 'AFF-AFL',
        'party_label': 'Affiliate',
        'summary': [
            'Promote approved products using platform-generated smart links and promo codes.',
            'Earn commissions only on verified sales and receive scheduled M-Pesa payouts.',
            'Spam, self-referrals, bots, and merchant circumvention are prohibited.',
        ],
        'sections': [
            ('1. Definitions', [
                'Platform means Affilia, owned and operated by Maridex Dev Labs.',
                'Affiliate means the marketer promoting products through the Platform.',
                'Smart Link means a unique tracking URL issued by the Platform.',
            ]),
            ('2. Platform Services', [
                'The Platform may provide marketplace access, generate links and promo codes, track conversions, and process scheduled payouts.',
                'The Platform may modify features or payout rules with notice and suspend abusive accounts.',
            ]),
            ('3. Affiliate Obligations', [
                'Affiliates must market honestly, avoid false claims, use only official links, and comply with Kenyan advertising and consumer laws.',
                'Prohibited conduct includes self-referral, bots, cookie stuffing, harassment, fake accounts, and fake sales.',
            ]),
            ('4. Commissions and Tracking', [
                'Commissions are earned only on approved sales and may be withheld while suspicious transactions are investigated.',
                'Attribution is based on the Platform tracking rules, including the smart-link attribution window and offline code ownership.',
            ]),
            ('5. Non-Circumvention and Disputes', [
                'Affiliates may not bypass the platform to deal directly with merchants or solicit competing off-platform arrangements.',
                'Disputes first go through good-faith negotiation, then mediation or arbitration in Kenya.',
            ]),
        ],
    },
}


def agreement_snapshot(contract_type: AgreementType, profile: dict, *, generated_at: datetime | None = None) -> dict:
    now = generated_at or datetime.now(timezone.utc)
    content = CONTRACT_CONTENT[contract_type]
    return {
        'contract_type': contract_type,
        'version': CURRENT_CONTRACT_VERSION,
        'title': content['title'],
        'summary': content['summary'],
        'generated_at': now.isoformat(),
        'party': {
            'full_name': profile.get('full_name'),
            'business_name': profile.get('business_name'),
            'phone_number': profile.get('phone_number'),
            'payout_phone': profile.get('payout_phone'),
            'mpesa_till': profile.get('mpesa_till'),
        },
    }


class ContractPDFGenerator:
    repo_root = Path(__file__).resolve().parents[4]
    logo_path = repo_root / 'apps/frontend/public/images/logo/affilia-mark.png'
    watermark_logo_path = repo_root / 'apps/frontend/public/images/logo/affilia-mark-watermark.png'
    ivory = colors.HexColor('#F7F3EC')
    ink = colors.HexColor('#171B24')
    charcoal = colors.HexColor('#2A3140')
    stone = colors.HexColor('#E2D9CB')
    muted = colors.HexColor('#6B7280')
    kenya_black = colors.HexColor('#000000')
    kenya_red = colors.HexColor('#BB0000')
    kenya_green = colors.HexColor('#009A44')
    gold = colors.HexColor('#B38A3C')

    def __init__(self, contract_type: AgreementType, profile: dict):
        self.contract_type = contract_type
        self.profile = profile
        self.content = CONTRACT_CONTENT[contract_type]
        self.buffer = io.BytesIO()
        self.doc = SimpleDocTemplate(
            self.buffer,
            pagesize=A4,
            leftMargin=19 * mm,
            rightMargin=19 * mm,
            topMargin=20 * mm,
            bottomMargin=18 * mm,
        )
        self.styles = getSampleStyleSheet()
        self._build_styles()

    def _build_styles(self):
        self.styles.add(ParagraphStyle(
            name='AffiliaKicker',
            parent=self.styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8.5,
            leading=11,
            alignment=TA_CENTER,
            textColor=self.kenya_red,
            spaceAfter=2 * mm,
        ))
        self.styles.add(ParagraphStyle(
            name='AffiliaTitle',
            parent=self.styles['Title'],
            fontName='Helvetica-Bold',
            fontSize=21,
            leading=25,
            alignment=TA_CENTER,
            textColor=self.ink,
            spaceAfter=2 * mm,
        ))
        self.styles.add(ParagraphStyle(
            name='AffiliaMeta',
            parent=self.styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            alignment=TA_CENTER,
            textColor=self.muted,
            spaceAfter=3 * mm,
        ))
        self.styles.add(ParagraphStyle(
            name='AffiliaLead',
            parent=self.styles['BodyText'],
            fontName='Helvetica',
            fontSize=10.2,
            leading=15,
            alignment=TA_CENTER,
            textColor=self.charcoal,
            spaceAfter=5 * mm,
        ))
        self.styles.add(ParagraphStyle(
            name='AffiliaSection',
            parent=self.styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12.5,
            leading=16,
            textColor=self.ink,
            spaceBefore=5 * mm,
            spaceAfter=2.5 * mm,
        ))
        self.styles.add(ParagraphStyle(
            name='AffiliaBody',
            parent=self.styles['BodyText'],
            fontName='Helvetica',
            fontSize=9.4,
            leading=14,
            alignment=TA_JUSTIFY,
            textColor=self.charcoal,
            spaceAfter=2 * mm,
        ))
        self.styles.add(ParagraphStyle(
            name='AffiliaLabel',
            parent=self.styles['BodyText'],
            fontName='Helvetica-Bold',
            fontSize=8.4,
            leading=11,
            alignment=TA_LEFT,
            textColor=self.gold,
            spaceAfter=1.5 * mm,
        ))
        self.styles.add(ParagraphStyle(
            name='AffiliaParty',
            parent=self.styles['BodyText'],
            fontName='Helvetica',
            fontSize=9.4,
            leading=13.5,
            alignment=TA_LEFT,
            textColor=self.charcoal,
            spaceAfter=1.25 * mm,
        ))
        self.styles.add(ParagraphStyle(
            name='AffiliaFooter',
            parent=self.styles['BodyText'],
            fontName='Helvetica',
            fontSize=7.5,
            leading=10,
            alignment=TA_CENTER,
            textColor=self.muted,
        ))

    def _draw_affilia_mark(self, canvas, x: float, y: float, scale: float = 1.0, *, include_wordmark: bool = True, alpha: float = 1.0):
        if self.logo_path.exists():
            canvas.saveState()
            size = 22 * scale
            canvas.drawImage(ImageReader(str(self.logo_path)), x, y, width=size, height=size, mask='auto', preserveAspectRatio=True)
            if include_wordmark:
                canvas.setFillColor(self.ink)
                canvas.setFont('Helvetica-Bold', 13 * scale)
                canvas.drawString(x + size + (5 * scale), y + size * 0.44, 'Affilia')
            canvas.restoreState()
            return

        canvas.saveState()
        try:
            canvas.setFillAlpha(alpha)
            canvas.setStrokeAlpha(alpha)
        except AttributeError:
            pass

        size = 22 * scale
        canvas.setFillColor(self.kenya_black)
        canvas.roundRect(x, y, size, size, 5 * scale, stroke=0, fill=1)
        canvas.setFillColor(self.kenya_red)
        canvas.rect(x + size * 0.18, y + size * 0.53, size * 0.64, size * 0.14, stroke=0, fill=1)
        canvas.setFillColor(self.kenya_green)
        canvas.rect(x + size * 0.18, y + size * 0.26, size * 0.64, size * 0.14, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        path = canvas.beginPath()
        path.moveTo(x + size * 0.50, y + size * 0.82)
        path.lineTo(x + size * 0.20, y + size * 0.14)
        path.lineTo(x + size * 0.34, y + size * 0.14)
        path.lineTo(x + size * 0.44, y + size * 0.38)
        path.lineTo(x + size * 0.56, y + size * 0.38)
        path.lineTo(x + size * 0.66, y + size * 0.14)
        path.lineTo(x + size * 0.80, y + size * 0.14)
        path.close()
        canvas.drawPath(path, stroke=0, fill=1)

        if include_wordmark:
            canvas.setFillColor(self.ink)
            canvas.setFont('Helvetica-Bold', 13 * scale)
            canvas.drawString(x + size + (5 * scale), y + size * 0.44, 'Affilia')

        canvas.restoreState()

    def _page_chrome(self, canvas, doc):
        width, height = A4
        canvas.saveState()
        canvas.setFillColor(self.ivory)
        canvas.rect(0, 0, width, height, stroke=0, fill=1)

        canvas.setFillColor(self.kenya_black)
        canvas.rect(0, height - 8, width * 0.30, 8, stroke=0, fill=1)
        canvas.setFillColor(self.kenya_red)
        canvas.rect(width * 0.30, height - 8, width * 0.22, 8, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.rect(width * 0.52, height - 8, width * 0.09, 8, stroke=0, fill=1)
        canvas.setFillColor(self.kenya_green)
        canvas.rect(width * 0.61, height - 8, width * 0.39, 8, stroke=0, fill=1)

        canvas.setStrokeColor(self.stone)
        canvas.setLineWidth(1)
        canvas.line(18 * mm, 16 * mm, width - 18 * mm, 16 * mm)

        watermark_path = self.watermark_logo_path if self.watermark_logo_path.exists() else self.logo_path
        if watermark_path.exists():
            canvas.drawImage(
                ImageReader(str(watermark_path)),
                67 * mm,
                112 * mm,
                width=74 * mm,
                height=74 * mm,
                mask='auto',
                preserveAspectRatio=True,
            )
        else:
            self._draw_affilia_mark(canvas, 74 * mm, 116 * mm, 2.9, include_wordmark=False, alpha=0.055)
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(self.muted)
        canvas.drawRightString(width - 19 * mm, 11 * mm, f'Page {doc.page}')
        canvas.restoreState()

    def _agreement_number(self, now: datetime) -> str:
        return f"{self.content['agreement_code']}-{now.strftime('%Y')}-DRAFT"

    def _party_rows(self) -> list[list[str]]:
        if self.contract_type == 'merchant':
            return [
                ['Party', self.profile.get('business_name') or '[Business Name]'],
                ['Contact Name', self.profile.get('full_name') or '[Full Name]'],
                ['Business Phone', self.profile.get('phone_number') or '[Phone]'],
                ['M-Pesa Till', self.profile.get('mpesa_till') or '[Till]'],
            ]
        return [
            ['Party', self.profile.get('full_name') or '[Affiliate Name]'],
            ['Phone', self.profile.get('phone_number') or '[Phone]'],
            ['Payout Phone', self.profile.get('payout_phone') or '[M-Pesa Phone]'],
            ['Channels', ', '.join(self.profile.get('promotion_channels') or []) or '[Channels]'],
        ]

    def _summary_table(self, now: datetime) -> Table:
        data = [
            ['Agreement No.', self._agreement_number(now), 'Version', CURRENT_CONTRACT_VERSION],
            ['Effective Draft Date', now.strftime('%d %b %Y'), 'Jurisdiction', 'Nakuru, Kenya'],
            ['Prepared For', self.content['party_label'], 'Prepared By', 'Maridex Dev Labs'],
        ]
        table = Table(data, colWidths=[31 * mm, 55 * mm, 28 * mm, 49 * mm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('BOX', (0, 0), (-1, -1), 0.8, self.stone),
            ('INNERGRID', (0, 0), (-1, -1), 0.6, self.stone),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (-1, -1), self.charcoal),
            ('TEXTCOLOR', (0, 0), (0, -1), self.gold),
            ('TEXTCOLOR', (2, 0), (2, -1), self.gold),
            ('FONTSIZE', (0, 0), (-1, -1), 8.8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        return table

    def _party_table(self) -> Table:
        rows = self._party_rows()
        table = Table(rows, colWidths=[34 * mm, 129 * mm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('BOX', (0, 0), (-1, -1), 0.8, self.stone),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, self.stone),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('TEXTCOLOR', (0, 0), (0, -1), self.gold),
            ('TEXTCOLOR', (1, 0), (1, -1), self.charcoal),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        return table

    def _signature_table(self) -> Table:
        rows = [
            ['Party Name', '____________________________________________'],
            ['Signature', '____________________________________________'],
            ['Date', '____ / ____ / __________'],
            ['Witness Name', '____________________________________________'],
            ['Witness Signature', '____________________________________________'],
        ]
        table = Table(rows, colWidths=[50 * mm, 110 * mm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('BOX', (0, 0), (-1, -1), 0.8, self.stone),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, self.stone),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('TEXTCOLOR', (0, 0), (0, -1), self.gold),
            ('TEXTCOLOR', (1, 0), (1, -1), self.charcoal),
            ('FONTSIZE', (0, 0), (-1, -1), 9.5),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        return table

    def generate(self) -> bytes:
        now = datetime.now(timezone.utc)
        story = []

        if self.logo_path.exists():
            logo = PlatypusImage(str(self.logo_path), width=24 * mm, height=24 * mm)
            logo.hAlign = 'CENTER'
            story.append(logo)
            story.append(Spacer(1, 2 * mm))
        story.append(Spacer(1, 3 * mm))
        story.append(Paragraph('FORMAL LEGAL INSTRUMENT', self.styles['AffiliaKicker']))
        story.append(Paragraph(self.content['title'], self.styles['AffiliaTitle']))
        story.append(Paragraph(
            'A platform agreement governing account use, commissions, escrow-linked obligations, lawful marketing conduct, and dispute handling.',
            self.styles['AffiliaLead'],
        ))
        story.append(self._summary_table(now))
        story.append(Spacer(1, 6 * mm))
        story.append(Paragraph('Platform Identity', self.styles['AffiliaSection']))
        story.append(Paragraph(
            'This Agreement is entered into between <b>Maridex Dev Labs</b>, trading as <b>Affilia</b>, of Nakuru, Kenya, and the party identified below. The Platform provides affiliate tracking, moderation, escrow-linked operations, analytics, and payment administration subject to the terms herein.',
            self.styles['AffiliaBody'],
        ))
        story.append(self._party_table())
        story.append(Spacer(1, 5 * mm))
        story.append(Paragraph('Executive Summary', self.styles['AffiliaSection']))
        for item in self.content['summary']:
            story.append(Paragraph(f'• {item}', self.styles['AffiliaBody']))

        for section_title, section_lines in self.content['sections']:
            story.append(Paragraph(section_title, self.styles['AffiliaSection']))
            for line in section_lines:
                story.append(Paragraph(line, self.styles['AffiliaBody']))

        story.append(Spacer(1, 4 * mm))
        story.append(HRFlowable(width='100%', thickness=1, color=self.gold, spaceBefore=2 * mm, spaceAfter=2 * mm))
        story.append(Paragraph(
            'This document should be read together with Affilia platform rules, data handling notices, moderation standards, and any fee schedule or product-policy updates issued by Maridex Dev Labs.',
            self.styles['AffiliaBody'],
        ))

        story.extend([
            PageBreak(),
            Spacer(1, 6 * mm),
            Paragraph('Execution and Acceptance', self.styles['AffiliaTitle']),
            Paragraph(
                'By signing below, the undersigned confirms that they have read, understood, and accepted this Agreement in full, and that the submitted identity, payout, and operational details are accurate and lawfully provided.',
                self.styles['AffiliaLead'],
            ),
            self._signature_table(),
            Spacer(1, 8 * mm),
            Paragraph('Platform Review and Verification', self.styles['AffiliaSection']),
            Paragraph(
                'For internal use by Affilia compliance and platform administration. Approval may be withheld where identity, document quality, payout details, or operational risk posture is insufficient.',
                self.styles['AffiliaBody'],
            ),
        ])

        platform_block = Table(
            [
                ['Reviewed by', '____________________________________________'],
                ['Review Date', '____________________________________________'],
                ['Status', 'Approved / Rejected / Revision Requested'],
                ['Notes', '______________________________________________________________'],
            ],
            colWidths=[42 * mm, 118 * mm],
        )
        platform_block.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('BOX', (0, 0), (-1, -1), 0.8, self.stone),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, self.stone),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (0, -1), self.gold),
            ('TEXTCOLOR', (1, 0), (1, -1), self.charcoal),
            ('FONTSIZE', (0, 0), (-1, -1), 9.2),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(platform_block)
        story.append(Spacer(1, 10 * mm))
        story.append(HRFlowable(width='100%', thickness=0.8, color=self.stone, spaceAfter=2 * mm))
        story.append(Paragraph(
            '© 2026 Maridex Dev Labs. Affilia is a proprietary platform brand. This agreement remains subject to Kenyan law and internal compliance review.',
            self.styles['AffiliaFooter'],
        ))

        self.doc.build(story, onFirstPage=self._page_chrome, onLaterPages=self._page_chrome)
        self.buffer.seek(0)
        return self.buffer.getvalue()


def review_dates() -> tuple[date, date]:
    effective = date.today()
    expiry = effective + timedelta(days=365)
    return effective, expiry
