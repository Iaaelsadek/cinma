/**
 * AI Content Moderator v2 - Final Policy
 * 
 * Policy A: Any sexual=yes (even suggestive) → QUARANTINE
 * Target Audience: Arab/Muslim families, 15+
 */

import dotenv from 'dotenv';

dotenv.config();

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const PROMPT_VERSION = 'v2';

/**
 * Moderate content using Mistral AI
 * @param {Object} content - Content to moderate
 * @returns {Object} Moderation result
 */
export async function moderateContent(content) {
    const title = content.title || content.name || '';
    const originalTitle = content.original_title || content.original_name || '';
    const overview = content.overview || '';
    const tagline = content.tagline || '';
    const genres = (content.genres || []).map(g => g.name || g).join(', ');
    const year = content.release_date || content.first_air_date || '';
    const rating = content.vote_average || 0;
    const votes = content.vote_count || 0;

    const prompt = `أنت نظام مراجعة محتوى لموقع أفلام عربي.
الجمهور: عائلات عربية مسلمة، أعمار 15+.

مهمتك: تحديد هل المحتوى يحتوي على محتوى جنسي/إيروتيكي/إباحي (صريح أو ضمني).

قواعد مهمة:
- لا تعتبر العنف/الرعب/الجريمة سببًا للرفض
- إذا كانت المعلومات ناقصة (لا overview/tagline أو بيانات غير كافية) → أرجع "uncertain"
- ❌ ممنوع approve عند نقص المعلومات
- ركز على المحتوى الفعلي، ليس فقط الكلمات المفتاحية

المحتوى:
- العنوان: ${title}
- العنوان الأصلي: ${originalTitle}
- الوصف: ${overview || 'غير متوفر'}
- الشعار: ${tagline || 'غير متوفر'}
- التصنيفات: ${genres || 'غير متوفر'}
- السنة: ${year || 'غير متوفر'}
- التقييم: ${rating}/10 (${votes} تصويت)

أمثلة:
- "Sex and the City" → sexual: yes, severity: suggestive (محتوى رومانسي للبالغين)
- "xXx" (Vin Diesel) → sexual: no (فيلم أكشن)
- "The Naked Gun" → sexual: no (كوميديا)
- "In the Realm of the Senses" → sexual: yes, severity: explicit
- محتوى بدون وصف → sexual: uncertain

أجب بـ JSON فقط:
{
  "sexual": "yes|no|uncertain",
  "severity": "none|suggestive|explicit",
  "confidence": 0.0-1.0,
  "reasons": ["سبب مختصر"],
  "action": "approve|quarantine"
}

منطق القرار:
- إذا sexual=yes (حتى suggestive) → action: "quarantine"
- إذا sexual=uncertain → action: "quarantine"
- إذا sexual=no و confidence >= 0.90 → action: "approve"
- إذا sexual=no و confidence < 0.90 → action: "quarantine"
- إذا المعلومات ناقصة → sexual: "uncertain", action: "quarantine"

أجب بـ JSON فقط، بدون شرح.`;

    try {
        const response = await fetch(MISTRAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: 'mistral-small-latest',
                messages: [
                    {
                        role: 'system',
                        content: 'أنت خبير مراجعة محتوى. أجب بـ JSON صحيح فقط.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            throw new Error(`Mistral API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content_text = data.choices[0].message.content;

        // Extract JSON from markdown code blocks if present
        let jsonText = content_text;
        if (content_text.includes('```json')) {
            jsonText = content_text.split('```json')[1].split('```')[0].trim();
        } else if (content_text.includes('```')) {
            jsonText = content_text.split('```')[1].split('```')[0].trim();
        }

        // Parse JSON from response
        const result = JSON.parse(jsonText);

        // Validate and normalize
        return {
            sexual: result.sexual || 'uncertain',
            severity: result.severity || 'none',
            confidence: parseFloat(result.confidence) || 0,
            reasons: Array.isArray(result.reasons) ? result.reasons : [],
            action: result.action || 'quarantine',
            model: 'mistral-small-latest',
            prompt_version: PROMPT_VERSION
        };

    } catch (error) {
        console.error('AI Moderation error:', error.message);

        // On error, default to quarantine (safe)
        return {
            sexual: 'uncertain',
            severity: 'none',
            confidence: 0,
            reasons: [`AI error: ${error.message}`],
            action: 'quarantine',
            model: 'mistral-small-latest',
            prompt_version: PROMPT_VERSION
        };
    }
}

/**
 * Convert AI result to database status (Policy A)
 * @param {Object} aiResult - AI moderation result
 * @returns {string} Database status
 */
export function getStatusFromAI(aiResult) {
    // Policy A: Any sexual=yes (even suggestive) → QUARANTINE
    if (aiResult.sexual === 'yes') {
        return 'QUARANTINED';
    }

    // uncertain → QUARANTINE
    if (aiResult.sexual === 'uncertain') {
        return 'QUARANTINED';
    }

    // sexual=no but low confidence → QUARANTINE
    if (aiResult.sexual === 'no' && aiResult.confidence < 0.90) {
        return 'QUARANTINED';
    }

    // sexual=no and high confidence → APPROVED
    if (aiResult.sexual === 'no' && aiResult.confidence >= 0.90) {
        return 'APPROVED';
    }

    // Default: QUARANTINE (safe)
    return 'QUARANTINED';
}

/**
 * Get reason code from AI result
 * @param {Object} aiResult - AI moderation result
 * @returns {string} Reason code
 */
export function getReasonCode(aiResult) {
    if (aiResult.sexual === 'yes') {
        return aiResult.severity === 'explicit' ? 'AI_SEXUAL_EXPLICIT' : 'AI_SEXUAL_SUGGESTIVE';
    }
    if (aiResult.sexual === 'uncertain') {
        return 'AI_UNCERTAIN';
    }
    if (aiResult.confidence < 0.90) {
        return 'AI_LOW_CONFIDENCE';
    }
    return 'AI_APPROVED';
}

/**
 * Determine if content should be published
 * @param {string} status - Moderation status
 * @param {string} adminStatus - Admin override status
 * @returns {boolean} Should publish
 */
export function shouldPublish(status, adminStatus = 'PENDING') {
    // Admin override takes precedence
    if (adminStatus === 'APPROVED') return true;
    if (adminStatus === 'BLOCKED') return false;

    // Otherwise, follow moderation status
    return status === 'APPROVED';
}

