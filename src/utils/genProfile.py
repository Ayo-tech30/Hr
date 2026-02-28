#!/usr/bin/env python3
"""
Shadow Garden Bot — Profile Card Generator
Generates profile cards matching the dark purple gaming aesthetic.
Usage: python3 genProfile.py <json_data> <output_path>
"""

import sys
import json
import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT_BOLD   = "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf"
FONT_MED    = "/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf"
FONT_REG    = "/usr/share/fonts/truetype/google-fonts/Poppins-Regular.ttf"

W, H = 620, 920

# ── Colour palette ────────────────────────────────────────────
BG_TOP      = (18,  8,  40)
BG_BOT      = (10,  4,  24)
PURPLE_MID  = (80, 30, 160)
GOLD        = (212, 175, 55)
GOLD_LIGHT  = (255, 223, 100)
PURPLE_GLOW = (140, 60, 220)
WHITE       = (255, 255, 255)
GREY        = (160, 150, 180)
DARK_PANEL  = (25, 12, 55, 210)
DIVIDER     = (60, 30, 100)
RED_XP      = (220, 50, 50)
GOLD_XP     = (212, 175, 55)
GREEN_XP    = (80, 200, 120)
BLUE_XP     = (100, 150, 255)

def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

def draw_rounded_rect(draw, xy, radius, fill, outline=None, outline_width=2):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill,
                           outline=outline, width=outline_width)

def draw_glow_circle(img, cx, cy, r, color, alpha=80):
    """Draw a soft radial glow behind the avatar circle."""
    glow = Image.new("RGBA", img.size, (0,0,0,0))
    gd = ImageDraw.Draw(glow)
    for i in range(6, 0, -1):
        a = int(alpha * (i / 6) * 0.6)
        rr = r + i * 12
        gd.ellipse([cx-rr, cy-rr, cx+rr, cy+rr], fill=(*color, a))
    img = Image.alpha_composite(img, glow)
    return img

def draw_star_field(img):
    """Scatter tiny bright dots as background stars."""
    import random
    random.seed(42)
    layer = Image.new("RGBA", img.size, (0,0,0,0))
    ld = ImageDraw.Draw(layer)
    for _ in range(120):
        x = random.randint(0, W)
        y = random.randint(0, H // 2)
        br = random.randint(80, 200)
        sz = random.choice([1,1,1,2])
        ld.ellipse([x, y, x+sz, y+sz], fill=(br, br, br+30, random.randint(60,160)))
    return Image.alpha_composite(img, layer)

def draw_xp_bar(draw, x, y, w, h, pct, color_left, color_right):
    """Draw a rounded XP progress bar."""
    # Background track
    draw.rounded_rectangle([x, y, x+w, y+h], radius=h//2,
                           fill=(30, 15, 60), outline=(50, 30, 90), width=1)
    if pct > 0:
        fill_w = max(h, int(w * min(pct, 1.0)))
        # Glow end dot
        draw.rounded_rectangle([x, y, x+fill_w, y+h], radius=h//2, fill=color_left)
        # Bright tip glow
        tip_x = x + fill_w - h
        draw.ellipse([tip_x, y-2, tip_x+h+4, y+h+2], fill=GOLD_LIGHT)

def make_avatar_circle(size=220):
    """Create a dark hooded silhouette avatar for unregistered."""
    img = Image.new("RGBA", (size, size), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Base dark circle
    d.ellipse([0,0,size,size], fill=(20,10,40))
    # Hood shape
    hw, hh = size//2, size//2
    # Cloak / body
    d.ellipse([hw-70, hh-10, hw+70, size+40], fill=(15,8,30))
    # Hood
    hood_pts = [
        (hw-55, hh-20), (hw-60, hh-60), (hw-40, hh-90),
        (hw, hh-100), (hw+40, hh-90), (hw+60, hh-60),
        (hw+55, hh-20)
    ]
    d.polygon(hood_pts, fill=(18, 10, 35))
    # Shadow inside hood
    d.ellipse([hw-28, hh-75, hw+28, hh-15], fill=(8,4,18))
    return img

def build_registered(data, out_path):
    name        = data.get("name", "Player")
    level       = data.get("level", 1)
    xp          = data.get("xp", 0)
    xp_needed   = level * 1000
    xp_pct      = min(xp / max(xp_needed, 1), 1.0)
    wallet      = data.get("balance", 0)
    bank        = data.get("bank", 0)
    gems        = data.get("gems", 0)
    stardust    = data.get("stardust", 0)
    # RPG XP breakdown
    combat_xp   = data.get("combatXp", 0)
    mission_xp  = data.get("missionXp", 0)
    dungeon_xp  = data.get("dungeonXp", 0)
    achieve_xp  = data.get("achieveXp", 0)
    kd          = data.get("kd", "0.00")
    matches     = data.get("matches", 0)
    rank        = data.get("rank", "Bronze")
    rank_pct    = data.get("rankPct", 0)
    bio         = data.get("bio", "No bio set")
    streak      = data.get("streak", 0)
    rpg_class   = data.get("rpgClass", "Warrior")
    dungeons    = data.get("dungeons", 0)

    # ── Canvas ────────────────────────────────────────────────
    img = Image.new("RGBA", (W, H), (0,0,0,0))

    # Gradient background
    bg = Image.new("RGBA", (W, H))
    bg_d = ImageDraw.Draw(bg)
    for y in range(H):
        t = y / H
        r = int(BG_TOP[0] + (BG_BOT[0]-BG_TOP[0])*t)
        g = int(BG_TOP[1] + (BG_BOT[1]-BG_TOP[1])*t)
        b = int(BG_TOP[2] + (BG_BOT[2]-BG_TOP[2])*t)
        bg_d.line([(0,y),(W,y)], fill=(r,g,b,255))
    img = Image.alpha_composite(img, bg)

    # Stars
    img = draw_star_field(img)

    # Purple mid-glow
    img = draw_glow_circle(img, W//2, 240, 130, PURPLE_GLOW, alpha=60)

    draw = ImageDraw.Draw(img)

    # ── Top decorative lines (like the reference image) ──────
    # Left bracket
    draw.line([(30, 210), (30, 175)], fill=PURPLE_GLOW, width=2)
    draw.line([(30, 175), (90, 175)], fill=PURPLE_GLOW, width=2)
    # Right bracket
    draw.line([(W-30, 210), (W-30, 175)], fill=PURPLE_GLOW, width=2)
    draw.line([(W-30, 175), (W-90, 175)], fill=PURPLE_GLOW, width=2)

    # ── Gold avatar ring ──────────────────────────────────────
    cx, cy, r = W//2, 175, 112
    for i in range(4, 0, -1):
        draw.ellipse([cx-r-i*2, cy-r-i*2, cx+r+i*2, cy+r+i*2],
                     outline=(*GOLD, 40+i*15), width=2)
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=GOLD, width=6)
    draw.ellipse([cx-r+8, cy-r+8, cx+r-8, cy+r-8], outline=(*GOLD_LIGHT, 80), width=2)

    # Avatar placeholder (anime silhouette style)
    avatar = make_avatar_circle(size=r*2-12)
    mask = Image.new("L", avatar.size, 0)
    ImageDraw.Draw(mask).ellipse([0,0,avatar.width,avatar.height], fill=255)
    img.paste(avatar, (cx-r+6, cy-r+6), mask)

    # ── Name ─────────────────────────────────────────────────
    f_name = font(FONT_BOLD, 52)
    name_upper = name.upper()
    bbox = draw.textbbox((0,0), name_upper, font=f_name)
    tw = bbox[2]-bbox[0]
    # Shadow
    draw.text((W//2 - tw//2 + 2, 302), name_upper, font=f_name, fill=(0,0,0,120))
    draw.text((W//2 - tw//2, 300), name_upper, font=f_name, fill=WHITE)

    # ── Level badge ──────────────────────────────────────────
    lv_text = f"LV.{level}"
    f_lv = font(FONT_BOLD, 26)
    lv_bbox = draw.textbbox((0,0), lv_text, font=f_lv)
    lw = lv_bbox[2]-lv_bbox[0] + 40
    lx = W//2 - lw//2
    draw_rounded_rect(draw, [lx, 362, lx+lw, 362+38], 8,
                      fill=(20,10,50), outline=GOLD, outline_width=2)
    draw.text((W//2 - (lv_bbox[2]-lv_bbox[0])//2, 365), lv_text,
              font=f_lv, fill=GOLD)

    # ── XP Bar ───────────────────────────────────────────────
    bar_x, bar_y, bar_w, bar_h = 50, 418, W-100, 18
    draw_xp_bar(draw, bar_x, bar_y, bar_w, bar_h, xp_pct, GOLD, GOLD_LIGHT)

    f_xp = font(FONT_MED, 20)
    xp_str = f"{xp:,} / {xp_needed:,} XP"
    xp_bb = draw.textbbox((0,0), xp_str, font=f_xp)
    draw.text((W//2 - (xp_bb[2]-xp_bb[0])//2, 444), xp_str, font=f_xp, fill=WHITE)

    # ── Bio strip ─────────────────────────────────────────────
    f_bio = font(FONT_REG, 17)
    bio_bb = draw.textbbox((0,0), bio, font=f_bio)
    draw.text((W//2-(bio_bb[2]-bio_bb[0])//2, 472), bio, font=f_bio, fill=GREY)

    # ── XP Breakdown (4 boxes like reference) ────────────────
    box_y = 508
    labels = [
        ("🏆", f"+{achieve_xp:,} XP", "Achievement XP", GOLD_XP),
        ("⚔️", f"+{combat_xp:,} XP",  "Combat XP",      RED_XP),
        ("📜", f"+{mission_xp:,} XP", "Mission XP",     GOLD_XP),
        ("⭐", f"+{dungeon_xp:,} XP", "Dungeon XP",     (150,80,255)),
    ]
    bw = (W - 60) // 4
    f_xpval = font(FONT_BOLD, 17)
    f_xplbl = font(FONT_REG, 12)
    for i, (emoji, val, lbl, col) in enumerate(labels):
        bx = 30 + i * (bw + 6)
        draw_rounded_rect(draw, [bx, box_y, bx+bw, box_y+90], 10,
                          fill=(25,12,55,200), outline=(60,30,100), outline_width=1)
        # Icon circle
        draw.ellipse([bx+bw//2-18, box_y+8, bx+bw//2+18, box_y+44],
                     fill=(40,20,80))
        # Emoji-style icon
        f_em = font(FONT_BOLD, 20)
        draw.text((bx+bw//2-10, box_y+11), emoji, font=f_em, fill=col)
        # Value
        vbb = draw.textbbox((0,0), val, font=f_xpval)
        draw.text((bx+bw//2-(vbb[2]-vbb[0])//2, box_y+50), val, font=f_xpval, fill=col)
        # Label
        lbb = draw.textbbox((0,0), lbl, font=f_xplbl)
        draw.text((bx+bw//2-(lbb[2]-lbb[0])//2, box_y+70), lbl, font=f_xplbl, fill=GREY)

    # ── Divider ──────────────────────────────────────────────
    draw.line([(40, 610), (W-40, 610)], fill=DIVIDER, width=1)

    # ── Stats row: K/D · Matches · Rank ─────────────────────
    f_stat_val = font(FONT_BOLD, 22)
    f_stat_lbl = font(FONT_REG, 14)
    stats = [
        (f"K/D: {kd}", "Kill/Death"),
        (f"Matches: {matches}", "Played"),
        (f"Rank: {rank}: {rank_pct}%", "Ranking"),
    ]
    for i, (val, lbl) in enumerate(stats):
        sx = 50 + i * 175
        draw.text((sx, 620), val, font=f_stat_val, fill=WHITE)
        draw.text((sx, 648), lbl, font=f_stat_lbl, fill=GREY)

    # ── Bottom info panel ─────────────────────────────────────
    panel_y = 680
    draw_rounded_rect(draw, [30, panel_y, W-30, panel_y+190], 14,
                      fill=(20,10,45,220), outline=(60,30,110), outline_width=1)

    f_p = font(FONT_MED, 18)
    f_pl = font(FONT_REG, 15)

    rows = [
        ("💵 Wallet",   f"{wallet:,} coins",      "💎 Gems",    f"{gems}"),
        ("🏦 Bank",     f"{bank:,} coins",         "⭐ Stardust", f"{stardust}"),
        ("🔥 Streak",   f"{streak} days",          "⚔️ Class",   rpg_class),
        ("🏟️ Dungeons", f"{dungeons} cleared",     "🌸 Bot",     "Shadow Garden"),
    ]
    for ri, (l1, v1, l2, v2) in enumerate(rows):
        ry = panel_y + 16 + ri * 42
        draw.text((50, ry), l1, font=f_pl, fill=GREY)
        draw.text((200, ry), v1, font=f_p, fill=WHITE)
        draw.text((360, ry), l2, font=f_pl, fill=GREY)
        draw.text((490, ry), v2, font=f_p, fill=WHITE)

    # ── Footer ────────────────────────────────────────────────
    f_foot = font(FONT_REG, 14)
    foot = "⋆☽ Sʜᴀᴅᴏᴡ Gᴀʀᴅᴇɴ ☾⋆"
    fbb = draw.textbbox((0,0), foot, font=f_foot)
    draw.text((W//2-(fbb[2]-fbb[0])//2, H-28), foot, font=f_foot, fill=(*PURPLE_GLOW, 200))

    img.save(out_path, "PNG")
    print("OK")

def build_unregistered(data, out_path):
    username = data.get("username", "Unknown")

    img = Image.new("RGBA", (W, H), (0,0,0,0))

    # Gradient bg
    bg = Image.new("RGBA", (W, H))
    bg_d = ImageDraw.Draw(bg)
    for y in range(H):
        t = y / H
        r = int(BG_TOP[0] + (BG_BOT[0]-BG_TOP[0])*t)
        g = int(BG_TOP[1] + (BG_BOT[1]-BG_TOP[1])*t)
        b = int(BG_TOP[2] + (BG_BOT[2]-BG_TOP[2])*t)
        bg_d.line([(0,y),(W,y)], fill=(r,g,b,255))
    img = Image.alpha_composite(img, bg)
    img = draw_star_field(img)
    img = draw_glow_circle(img, W//2, 220, 110, (100,40,180), alpha=40)

    draw = ImageDraw.Draw(img)

    # Bracket lines
    draw.line([(30, 210), (30, 175)], fill=(80,40,140), width=2)
    draw.line([(30, 175), (90, 175)], fill=(80,40,140), width=2)
    draw.line([(W-30, 210), (W-30, 175)], fill=(80,40,140), width=2)
    draw.line([(W-30, 175), (W-90, 175)], fill=(80,40,140), width=2)

    # Avatar ring (dimmer gold for unregistered)
    cx, cy, r = W//2, 175, 112
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(120, 100, 30), width=5)
    draw.ellipse([cx-r+7, cy-r+7, cx+r-7, cy+r-7], outline=(60,50,15,60), width=2)

    avatar = make_avatar_circle(size=r*2-12)
    # Desaturate / darken for unregistered
    avatar = avatar.convert("L").convert("RGBA")
    mask = Image.new("L", avatar.size, 0)
    ImageDraw.Draw(mask).ellipse([0,0,avatar.width,avatar.height], fill=255)
    img.paste(avatar, (cx-r+6, cy-r+6), mask)

    f_title = font(FONT_BOLD, 38)
    t = "UNREGISTERED PLAYER"
    bb = draw.textbbox((0,0), t, font=f_title)
    draw.text((W//2-(bb[2]-bb[0])//2+2, 302), t, font=f_title, fill=(0,0,0,100))
    draw.text((W//2-(bb[2]-bb[0])//2, 300), t, font=f_title, fill=WHITE)

    # Register button
    btn_w, btn_h = 280, 52
    bx = W//2 - btn_w//2
    by = 360
    draw_rounded_rect(draw, [bx, by, bx+btn_w, by+btn_h], 8,
                      fill=(20,10,45), outline=GOLD, outline_width=2)
    f_btn = font(FONT_BOLD, 22)
    btn_t = "REGISTER"
    bbb = draw.textbbox((0,0), btn_t, font=f_btn)
    draw.text((W//2-(bbb[2]-bbb[0])//2, by+13), btn_t, font=f_btn, fill=GOLD)

    f_sub = font(FONT_MED, 18)
    sub = f"@{username} · NO USERNAME · NO LEVEL"
    sbb = draw.textbbox((0,0), sub, font=f_sub)
    draw.text((W//2-(sbb[2]-sbb[0])//2, 430), sub, font=f_sub, fill=GREY)

    # Divider
    draw.line([(40, 480), (W-40, 480)], fill=DIVIDER, width=1)

    # 3 locked stat boxes
    bw2 = (W - 80) // 3
    f_lock_lbl = font(FONT_BOLD, 16)
    lock_labels = ["K/D", "MATCHES", "RANK"]
    for i, lbl in enumerate(lock_labels):
        bx2 = 40 + i*(bw2+10)
        draw_rounded_rect(draw, [bx2, 500, bx2+bw2, 620], 10,
                          fill=(20,10,45,200), outline=(50,25,90), outline_width=1)
        # Lock icon (drawn)
        lox, loy = bx2+bw2//2, 540
        draw.rounded_rectangle([lox-16, loy-8, lox+16, loy+18], radius=4,
                               fill=(50,30,80), outline=GREY, width=2)
        draw.arc([lox-12, loy-26, lox+12, loy-4], 180, 360, fill=GREY, width=3)
        draw.ellipse([lox-3, loy+2, lox+3, loy+10], fill=GREY)

        lb_bb = draw.textbbox((0,0), lbl, font=f_lock_lbl)
        draw.text((bx2+bw2//2-(lb_bb[2]-lb_bb[0])//2, 628), lbl,
                  font=f_lock_lbl, fill=GREY)

    # Tip
    f_tip = font(FONT_REG, 15)
    tip = "Type .register to unlock your profile!"
    tbb = draw.textbbox((0,0), tip, font=f_tip)
    draw.text((W//2-(tbb[2]-tbb[0])//2, 680), tip, font=f_tip, fill=(*PURPLE_GLOW, 180))

    f_foot = font(FONT_REG, 14)
    foot = "⋆☽ Sʜᴀᴅᴏᴡ Gᴀʀᴅᴇɴ ☾⋆"
    fbb = draw.textbbox((0,0), foot, font=f_foot)
    draw.text((W//2-(fbb[2]-fbb[0])//2, H-28), foot, font=f_foot, fill=(*PURPLE_GLOW, 200))

    img.save(out_path, "PNG")
    print("OK")

if __name__ == "__main__":
    data = json.loads(sys.argv[1])
    out_path = sys.argv[2]
    mode = data.get("mode", "registered")
    if mode == "unregistered":
        build_unregistered(data, out_path)
    else:
        build_registered(data, out_path)
