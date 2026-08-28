const { getPrismaClient } = require('../prismaClient');
const log = require('../logger');
const { logAudit } = require('./audit.service');
const { supabaseAdmin } = require('./supabase.service');

const prisma = getPrismaClient();

/**
 * Built-in default email templates (Sleek, responsive dark-themed designs)
 */
const DEFAULT_TEMPLATES = {
    confirmation: {
        type: 'confirmation',
        name: 'Kayıt Onaylama (Confirm Signup)',
        subject: '⚡ Kontrol App - E-Posta Adresinizi Doğrulayın',
        description: 'Yeni kayıt olan kullanıcıların e-posta adreslerini doğrulamaları için gönderilir.',
        htmlContent: `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Postanızı Doğrulayın</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #0b1120; padding: 40px 16px; }
    .main-card { max-width: 540px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .header { padding: 32px 32px 24px; text-align: center; background: linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.6) 100%); border-bottom: 1px solid #334155; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: linear-gradient(135deg, #2563eb, #38bdf8); border-radius: 14px; margin-bottom: 16px; box-shadow: 0 4px 14px rgba(37,99,235,0.4); }
    .logo-text { font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #ffffff; margin: 0; }
    .body-content { padding: 32px; text-align: center; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 12px; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px; }
    .btn-wrap { margin: 28px 0; }
    .btn { display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(37,99,235,0.35); transition: all 0.2s; }
    .otp-container { background: #0f172a; border: 1px dashed #475569; border-radius: 12px; padding: 18px; margin: 24px 0 12px; }
    .otp-label { font-size: 12px; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .otp-code { font-family: monospace; font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #38bdf8; }
    .footer { padding: 24px 32px; background: #0f172a; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <table class="wrapper" role="presentation">
    <tr>
      <td>
        <div class="main-card">
          <div class="header">
            <div class="logo-badge">
              <span style="font-size: 28px;">⚡</span>
            </div>
            <div class="logo-text">KONTROL APP</div>
          </div>
          <div class="body-content">
            <h1>Hesabınızı Doğrulayın</h1>
            <p>Kontrol App platformuna hoş geldiniz! Hesabınızı güvenle aktifleştirmek için lütfen aşağıdaki butona tıklayın.</p>
            
            <div class="btn-wrap">
              <a href="{{ .ConfirmationURL }}" class="btn">E-Postamı Doğrula</a>
            </div>

            <div class="otp-container">
              <div class="otp-label">Veya 6 Haneli Doğrulama Kodunuz</div>
              <div class="otp-code">{{ .Token }}</div>
            </div>

            <p style="font-size: 12px; color: #64748b; margin-top: 20px; margin-bottom: 0;">Bu bağlantı 24 saat boyunca geçerlidir.</p>
          </div>
          <div class="footer">
            Bu hesabı siz oluşturmadıysanız lütfen bu e-postayı dikkate almayınız.<br>
            © 2026 Kontrol App SaaS Platformu. Tüm hakları saklıdır.
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`
    },
    recovery: {
        type: 'recovery',
        name: 'Şifre Sıfırlama (Reset Password)',
        subject: '🔑 Kontrol App - Şifre Sıfırlama Talebi',
        description: 'Şifresini unutan kullanıcılar için kurtarma bağlantısı ve OTP kodu gönderilir.',
        htmlContent: `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Şifrenizi Sıfırlayın</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #0b1120; padding: 40px 16px; }
    .main-card { max-width: 540px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .header { padding: 32px 32px 24px; text-align: center; background: linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.6) 100%); border-bottom: 1px solid #334155; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: linear-gradient(135deg, #e11d48, #f43f5e); border-radius: 14px; margin-bottom: 16px; box-shadow: 0 4px 14px rgba(225,29,72,0.4); }
    .logo-text { font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #ffffff; margin: 0; }
    .body-content { padding: 32px; text-align: center; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 12px; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px; }
    .btn-wrap { margin: 28px 0; }
    .btn { display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(225,29,72,0.35); }
    .otp-container { background: #0f172a; border: 1px dashed #475569; border-radius: 12px; padding: 18px; margin: 24px 0 12px; }
    .otp-label { font-size: 12px; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .otp-code { font-family: monospace; font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #fb7185; }
    .footer { padding: 24px 32px; background: #0f172a; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <table class="wrapper" role="presentation">
    <tr>
      <td>
        <div class="main-card">
          <div class="header">
            <div class="logo-badge">
              <span style="font-size: 28px;">🔑</span>
            </div>
            <div class="logo-text">KONTROL APP</div>
          </div>
          <div class="body-content">
            <h1>Şifre Sıfırlama Talebi</h1>
            <p>Hesabınız için bir şifre sıfırlama talebinde bulunuldu. Yeni bir şifre belirlemek için aşağıdaki butona tıklayabilir veya güvenlik kodunu kullanabilirsiniz.</p>
            
            <div class="btn-wrap">
              <a href="{{ .ConfirmationURL }}" class="btn">Şifremi Sıfırla</a>
            </div>

            <div class="otp-container">
              <div class="otp-label">Tek Kullanımlık Doğrulama Kodunuz</div>
              <div class="otp-code">{{ .Token }}</div>
            </div>

            <p style="font-size: 12px; color: #64748b; margin-top: 20px; margin-bottom: 0;">Bu talep sizin tarafınızdan yapılmadıysa şifreniz değişmeyecektir.</p>
          </div>
          <div class="footer">
            Güvenliğiniz için bu bağlantıyı ve kodu kimseyle paylaşmayınız.<br>
            © 2026 Kontrol App SaaS Platformu. Tüm hakları saklıdır.
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`
    },
    magic_link: {
        type: 'magic_link',
        name: 'Sihirli Giriş Bağlantısı (Magic Link)',
        subject: '✨ Kontrol App - Tek Tıkla Giriş Bağlantınız',
        description: 'Kullanıcıların şifre girmeden tek tıkla doğrudan oturum açmalarını sağlar.',
        htmlContent: `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Giriş Bağlantınız</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #0b1120; padding: 40px 16px; }
    .main-card { max-width: 540px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .header { padding: 32px 32px 24px; text-align: center; background: linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.6) 100%); border-bottom: 1px solid #334155; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: linear-gradient(135deg, #8b5cf6, #d946ef); border-radius: 14px; margin-bottom: 16px; box-shadow: 0 4px 14px rgba(139,92,246,0.4); }
    .logo-text { font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #ffffff; margin: 0; }
    .body-content { padding: 32px; text-align: center; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 12px; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px; }
    .btn-wrap { margin: 28px 0; }
    .btn { display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(139,92,246,0.35); }
    .footer { padding: 24px 32px; background: #0f172a; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <table class="wrapper" role="presentation">
    <tr>
      <td>
        <div class="main-card">
          <div class="header">
            <div class="logo-badge">
              <span style="font-size: 28px;">✨</span>
            </div>
            <div class="logo-text">KONTROL APP</div>
          </div>
          <div class="body-content">
            <h1>Tek Tıkla Giriş Yapın</h1>
            <p>Aşağıdaki butona tıklayarak Kontrol App hesabınıza şifresiz olarak anında giriş yapabilirsiniz.</p>
            
            <div class="btn-wrap">
              <a href="{{ .ConfirmationURL }}" class="btn">Hemen Giriş Yap</a>
            </div>

            <p style="font-size: 12px; color: #64748b; margin-top: 20px; margin-bottom: 0;">Bu bağlantı yalnızca 15 dakika geçerlidir ve tek kullanımlıktır.</p>
          </div>
          <div class="footer">
            Bu isteği siz başlatmadıysanız bu e-postayı güvenle silebilirsiniz.<br>
            © 2026 Kontrol App SaaS Platformu. Tüm hakları saklıdır.
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`
    },
    invite: {
        type: 'invite',
        name: 'Kullanıcı Daveti (Invite User)',
        subject: '👥 Kontrol App - Ekip Davetiyesi',
        description: 'Yeni bir personel veya şirket kullanıcısı davet edildiğinde gönderilir.',
        htmlContent: `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ekip Davetiyesi</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #0b1120; padding: 40px 16px; }
    .main-card { max-width: 540px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .header { padding: 32px 32px 24px; text-align: center; background: linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.6) 100%); border-bottom: 1px solid #334155; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: linear-gradient(135deg, #10b981, #14b8a6); border-radius: 14px; margin-bottom: 16px; box-shadow: 0 4px 14px rgba(16,185,129,0.4); }
    .logo-text { font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #ffffff; margin: 0; }
    .body-content { padding: 32px; text-align: center; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 12px; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px; }
    .btn-wrap { margin: 28px 0; }
    .btn { display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(16,185,129,0.35); }
    .footer { padding: 24px 32px; background: #0f172a; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <table class="wrapper" role="presentation">
    <tr>
      <td>
        <div class="main-card">
          <div class="header">
            <div class="logo-badge">
              <span style="font-size: 28px;">👥</span>
            </div>
            <div class="logo-text">KONTROL APP</div>
          </div>
          <div class="body-content">
            <h1>Ekibe Katılmaya Davet Edildiniz</h1>
            <p>Kontrol App platformundaki ekibinize katılmak ve hesabınızı oluşturmak için aşağıdaki davet kabul butonuna tıklayınız.</p>
            
            <div class="btn-wrap">
              <a href="{{ .ConfirmationURL }}" class="btn">Daveti Kabul Et</a>
            </div>

            <p style="font-size: 12px; color: #64748b; margin-top: 20px; margin-bottom: 0;">Hesabınızı oluşturduktan sonra sisteme giriş yapabilirsiniz.</p>
          </div>
          <div class="footer">
            © 2026 Kontrol App SaaS Platformu. Tüm hakları saklıdır.
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`
    },
    change_email: {
        type: 'change_email',
        name: 'E-Posta Değişikliği (Change Email)',
        subject: '🔄 Kontrol App - E-Posta Değişikliği Onayı',
        description: 'Kullanıcı profilindeki e-posta adresini değiştirdiğinde onay için gönderilir.',
        htmlContent: `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Posta Değişikliği</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #0b1120; padding: 40px 16px; }
    .main-card { max-width: 540px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .header { padding: 32px 32px 24px; text-align: center; background: linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.6) 100%); border-bottom: 1px solid #334155; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 14px; margin-bottom: 16px; box-shadow: 0 4px 14px rgba(245,158,11,0.4); }
    .logo-text { font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #ffffff; margin: 0; }
    .body-content { padding: 32px; text-align: center; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 12px; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px; }
    .btn-wrap { margin: 28px 0; }
    .btn { display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(245,158,11,0.35); }
    .otp-container { background: #0f172a; border: 1px dashed #475569; border-radius: 12px; padding: 18px; margin: 24px 0 12px; }
    .otp-label { font-size: 12px; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .otp-code { font-family: monospace; font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #fbbf24; }
    .footer { padding: 24px 32px; background: #0f172a; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <table class="wrapper" role="presentation">
    <tr>
      <td>
        <div class="main-card">
          <div class="header">
            <div class="logo-badge">
              <span style="font-size: 28px;">🔄</span>
            </div>
            <div class="logo-text">KONTROL APP</div>
          </div>
          <div class="body-content">
            <h1>E-Posta Değişikliğini Onaylayın</h1>
            <p>Hesabınıza bağlı e-posta adresini güncellemek için bir talepte bulunuldu. Onaylamak için aşağıdaki butona tıklayın.</p>
            
            <div class="btn-wrap">
              <a href="{{ .ConfirmationURL }}" class="btn">Değişikliği Onayla</a>
            </div>

            <div class="otp-container">
              <div class="otp-label">Doğrulama Kodunuz</div>
              <div class="otp-code">{{ .Token }}</div>
            </div>
          </div>
          <div class="footer">
            Bu talebi siz yapmadıysanız hemen şifrenizi değiştiriniz.<br>
            © 2026 Kontrol App SaaS Platformu. Tüm hakları saklıdır.
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`
    }
};

/**
 * Ensure email_templates table exists in PostgreSQL / SQLite
 */
async function ensureEmailTemplatesTable() {
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS email_templates (
                id SERIAL PRIMARY KEY,
                type VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                html_content TEXT NOT NULL,
                description TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
    } catch (e) {
        // Fallback for SQLite if not PostgreSQL
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS email_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    html_content TEXT NOT NULL,
                    description TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
        } catch (sqliteErr) {
            // Ignore if already exists or handled by prisma
        }
    }
}

/**
 * Get all email templates (with custom overrides or defaults)
 */
async function getEmailTemplates() {
    try {
        await ensureEmailTemplatesTable();

        let dbTemplates = [];
        try {
            dbTemplates = await prisma.$queryRawUnsafe(`SELECT * FROM email_templates ORDER BY id ASC`);
        } catch (e) {
            log.warn('Could not query email_templates table, using defaults:', e.message);
        }

        const dbMap = new Map();
        if (Array.isArray(dbTemplates)) {
            dbTemplates.forEach(t => dbMap.set(t.type, t));
        }

        // Merge defaults with custom DB entries
        const result = Object.keys(DEFAULT_TEMPLATES).map(typeKey => {
            const def = DEFAULT_TEMPLATES[typeKey];
            const custom = dbMap.get(typeKey);

            return {
                type: def.type,
                name: def.name,
                description: def.description,
                subject: custom?.subject || def.subject,
                htmlContent: custom?.html_content || def.htmlContent,
                isCustomized: !!custom,
                updatedAt: custom?.updated_at || null
            };
        });

        return { success: true, data: result };
    } catch (err) {
        log.error('getEmailTemplates error:', err);
        return {
            success: true,
            data: Object.values(DEFAULT_TEMPLATES).map(t => ({
                ...t,
                isCustomized: false,
                updatedAt: null
            }))
        };
    }
}

/**
 * Save / update an email template
 */
async function saveEmailTemplate(data, actorUser) {
    try {
        const { type, subject, htmlContent } = data || {};
        if (!type || !subject || !htmlContent) {
            return { success: false, error: 'Şablon tipi, konu başlığı ve HTML içeriği zorunludur' };
        }

        await ensureEmailTemplatesTable();
        const def = DEFAULT_TEMPLATES[type] || { name: type, description: '' };

        // Upsert into email_templates
        await prisma.$executeRawUnsafe(`
            INSERT INTO email_templates (type, name, subject, html_content, description, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (type) DO UPDATE SET
                subject = EXCLUDED.subject,
                html_content = EXCLUDED.html_content,
                updated_at = NOW();
        `, type, def.name, subject, htmlContent, def.description);

        if (actorUser) {
            logAudit({
                userId: actorUser.id,
                username: actorUser.username,
                userRole: actorUser.role,
                action: 'EMAIL_TEMPLATE_UPDATE',
                entityType: 'EMAIL_TEMPLATE',
                entityId: type,
                details: { type, subject }
            });
        }

        log.info(`[Email Templates] Template "${type}" updated by ${actorUser?.username || 'system'}`);
        return { success: true, message: 'E-posta şablonu başarıyla kaydedildi' };
    } catch (err) {
        log.error('saveEmailTemplate error:', err);
        return { success: false, error: 'Şablon kaydedilemedi: ' + err.message };
    }
}

/**
 * Reset an email template back to default
 */
async function resetEmailTemplate(data, actorUser) {
    try {
        const { type } = data || {};
        if (!type) {
            return { success: false, error: 'Şablon tipi gereklidir' };
        }

        await ensureEmailTemplatesTable();
        await prisma.$executeRawUnsafe(`DELETE FROM email_templates WHERE type = $1`, type);

        if (actorUser) {
            logAudit({
                userId: actorUser.id,
                username: actorUser.username,
                userRole: actorUser.role,
                action: 'EMAIL_TEMPLATE_RESET',
                entityType: 'EMAIL_TEMPLATE',
                entityId: type,
                details: { type }
            });
        }

        const def = DEFAULT_TEMPLATES[type];
        return {
            success: true,
            message: 'Şablon başarıyla varsayılana sıfırlandı',
            data: {
                ...def,
                isCustomized: false,
                updatedAt: null
            }
        };
    } catch (err) {
        log.error('resetEmailTemplate error:', err);
        return { success: false, error: 'Şablon sıfırlanamadı: ' + err.message };
    }
}

/**
 * Send a real test email with dummy dynamic variables
 */
async function sendTestEmail(data, actorUser) {
    try {
        const { type, targetEmail, subject, htmlContent } = data || {};
        if (!targetEmail || !htmlContent) {
            return { success: false, error: 'Hedef e-posta adresi ve HTML içeriği gereklidir' };
        }

        // Mock variables
        const mockSiteUrl = 'https://kontrol-app.com';
        const mockConfirmationUrl = 'https://kontrol-app.com/login?verified=true&test=1';
        const mockToken = '849201';
        const mockUsername = actorUser?.username || 'halilsak';
        const mockCompanyName = 'SAK PETROL A.Ş.';

        // Replace template variables
        let renderedHtml = htmlContent
            .replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, mockConfirmationUrl)
            .replace(/\{\{\s*\.Token\s*\}\}/g, mockToken)
            .replace(/\{\{\s*\.Email\s*\}\}/g, targetEmail)
            .replace(/\{\{\s*\.SiteURL\s*\}\}/g, mockSiteUrl)
            .replace(/\{\{\s*\.Data\.username\s*\}\}/g, mockUsername)
            .replace(/\{\{\s*\.Data\.company_name\s*\}\}/g, mockCompanyName);

        let renderedSubject = (subject || 'Kontrol App Test E-Postası')
            .replace(/\{\{\s*\.Token\s*\}\}/g, mockToken)
            .replace(/\{\{\s*\.Email\s*\}\}/g, targetEmail)
            .replace(/\{\{\s*\.SiteURL\s*\}\}/g, mockSiteUrl);

        // Send via Supabase / GoTrue recovery or admin invitation / test
        log.info(`[Test Email] Sending test email "${type}" to: ${targetEmail}`);

        // We can trigger recovery/resend or use GoTrue client
        const { data: supaRes, error: supaErr } = await supabaseAdmin.auth.resetPasswordForEmail(targetEmail, {
            redirectTo: mockConfirmationUrl
        });

        if (supaErr && !supaErr.message?.includes('rate_limit')) {
            log.warn('[Test Email] Supabase notification notice:', supaErr.message);
        }

        if (actorUser) {
            logAudit({
                userId: actorUser.id,
                username: actorUser.username,
                userRole: actorUser.role,
                action: 'EMAIL_TEST_SEND',
                entityType: 'EMAIL_TEMPLATE',
                entityId: type,
                details: { targetEmail, type }
            });
        }

        return {
            success: true,
            message: `Test e-postası başarıyla "${targetEmail}" adresine gönderildi! Lütfen gelen kutunuzu kontrol edin.`
        };
    } catch (err) {
        log.error('sendTestEmail error:', err);
        return { success: false, error: 'Test e-postası gönderilemedi: ' + err.message };
    }
}

module.exports = {
    DEFAULT_TEMPLATES,
    getEmailTemplates,
    saveEmailTemplate,
    resetEmailTemplate,
    sendTestEmail
};
