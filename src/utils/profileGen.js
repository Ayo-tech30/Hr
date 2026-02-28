/**
 * Shadow Garden Bot — Profile Card Generator
 * Pure Node.js: SVG rendered to PNG via sharp.
 * Zero Python, zero canvas, zero external scripts.
 */

'use strict';
const sharp = require('sharp');

const C = {
  bg:'#0a071a',panel:'#12102a',panel2:'#1a1638',rim:'#251f4a',
  gold:'#c9a227',gold2:'#e8c84a',gold3:'#f5d86e',goldDim:'#7a5f0e',
  violet:'#5a1fcc',violet2:'#7b35f0',violet3:'#9d63ff',
  text:'#ddd6f8',muted:'#7a6fa0',faint:'#3d3460',
  success:'#3dcc7e',danger:'#cc3d3d',
};

function esc(s){
  return String(s??'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtNum(n){return Number(n||0).toLocaleString('en-US');}
function rankColor(r){
  return{Bronze:'#cd7f32',Silver:'#b0b0c8',Gold:C.gold,
    Platinum:'#c0c0ff',Diamond:'#5a9fff',Master:'#cc1f6e'}[r]||C.gold;
}

function buildRegisteredSVG(d){
  const W=620,H=940;
  const xpNeeded=(d.level||1)*1000;
  const xpCur=Math.min(d.xp||0,xpNeeded);
  const xpFilled=Math.round(420*(xpCur/xpNeeded));
  const totalRpgXp=(d.achieveXp||0)+(d.combatXp||0)+(d.missionXp||0)+(d.dungeonXp||0)||1;
  const rpgW=350;
  function rw(v){return Math.round(rpgW*Math.min((v||0)/totalRpgXp,1));}
  const rc=rankColor(d.rank||'Bronze');

  // star field
  let stars='';
  const seed=[137,271,89,503,619,43,181,317,457,73,239,389];
  for(let i=0;i<40;i++){
    const sx=(seed[i%12]*i*17+i*31)%W;
    const sy=(seed[i%12]*i*23+i*47)%H;
    const sr=Math.random()<0.3?1.2:0.6;
    stars+=`<circle cx="${sx}" cy="${sy}" r="${sr}" fill="white" opacity="${0.1+((i*7)%5)*0.06}"/>`;
  }

  return`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#07051a"/><stop offset="100%" stop-color="#100c28"/>
  </linearGradient>
  <linearGradient id="gld" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${C.goldDim}"/><stop offset="60%" stop-color="${C.gold}"/>
    <stop offset="100%" stop-color="${C.gold3}"/>
  </linearGradient>
  <radialGradient id="hdrGlow" cx="50%" cy="0%" r="70%">
    <stop offset="0%" stop-color="${C.violet2}" stop-opacity=".3"/>
    <stop offset="100%" stop-color="${C.violet2}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="avatarRing" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${C.gold}"/>
    <stop offset="50%" stop-color="${C.violet3}"/>
    <stop offset="100%" stop-color="${C.gold2}"/>
  </linearGradient>
  <linearGradient id="ag" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#7a5f0e"/><stop offset="100%" stop-color="#c9a227"/>
  </linearGradient>
  <linearGradient id="cg" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#7a1010"/><stop offset="100%" stop-color="#cc3d3d"/>
  </linearGradient>
  <linearGradient id="mg" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#0e6635"/><stop offset="100%" stop-color="#3dcc7e"/>
  </linearGradient>
  <linearGradient id="dg" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#4020aa"/><stop offset="100%" stop-color="#9d63ff"/>
  </linearGradient>
  <clipPath id="cc"><rect width="${W}" height="${H}" rx="22"/></clipPath>
</defs>
<g clip-path="url(#cc)">
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#hdrGlow)"/>
  ${stars}
  <!-- grid -->
  ${Array.from({length:11},(_,i)=>`<line x1="${(i+1)*56}" y1="0" x2="${(i+1)*56}" y2="${H}" stroke="${C.faint}" stroke-width=".4" stroke-opacity=".2"/>`).join('')}
  ${Array.from({length:17},(_,i)=>`<line x1="0" y1="${(i+1)*56}" x2="${W}" y2="${(i+1)*56}" stroke="${C.faint}" stroke-width=".4" stroke-opacity=".2"/>`).join('')}

  <!-- top border -->
  <rect width="${W}" height="2.5" fill="url(#gld)"/>

  <!-- HEADER BG -->
  <rect x="0" y="0" width="${W}" height="165" fill="${C.panel}" fill-opacity=".75"/>
  <rect x="0" y="163" width="${W}" height="1" fill="url(#gld)" fill-opacity=".5"/>

  <!-- Avatar ring + emoji -->
  <circle cx="90" cy="90" r="64" fill="url(#avatarRing)" opacity=".9"/>
  <circle cx="90" cy="90" r="59" fill="${C.panel2}"/>
  <text x="90" y="107" text-anchor="middle" font-family="serif" font-size="54">🌸</text>

  <!-- Name -->
  <text x="178" y="58" fill="${C.text}" font-size="25" font-weight="700"
    font-family="'Arial Black','Arial',sans-serif" letter-spacing=".5">${esc((d.name||'Player').slice(0,20))}</text>

  <!-- Level badge -->
  <rect x="178" y="67" width="70" height="22" rx="11"
    fill="${C.gold}" fill-opacity=".1" stroke="${C.gold}" stroke-width="1"/>
  <text x="213" y="83" text-anchor="middle" fill="${C.gold}"
    font-size="10.5" font-weight="700" font-family="monospace" letter-spacing="1">LV.${d.level||1}</text>

  <!-- Rank badge -->
  <rect x="256" y="67" width="76" height="22" rx="11"
    fill="${rc}" fill-opacity=".1" stroke="${rc}" stroke-width="1"/>
  <text x="294" y="83" text-anchor="middle" fill="${rc}"
    font-size="10.5" font-weight="700" font-family="monospace" letter-spacing="1">${esc(d.rank||'Bronze')}</text>

  <!-- Class + streak -->
  <text x="178" y="107" fill="${C.violet3}" font-size="11.5" font-family="monospace">
    ⚔️ ${esc(d.rpgClass||'Warrior')} · 🔥 ${d.streak||0} day streak
  </text>

  <!-- Bio -->
  <text x="178" y="132" fill="${C.muted}" font-size="11" font-family="sans-serif" font-style="italic">
    "${esc((d.bio||'No bio set').slice(0,40))}"
  </text>

  <!-- XP SECTION LABEL -->
  <text x="36" y="188" fill="${C.muted}" font-size="10" font-family="monospace" letter-spacing="1.5">EXPERIENCE</text>
  <text x="${W-36}" y="188" fill="${C.gold}" font-size="10" font-family="monospace" text-anchor="end">
    ${fmtNum(xpCur)} / ${fmtNum(xpNeeded)} XP
  </text>
  <!-- XP track -->
  <rect x="36" y="194" width="420" height="9" rx="4.5" fill="${C.rim}"/>
  <rect x="36" y="194" width="${xpFilled}" height="9" rx="4.5" fill="url(#gld)"/>
  ${xpFilled>8?`<circle cx="${36+xpFilled}" cy="198.5" r="5" fill="${C.gold3}" opacity=".75"/>`:''}
  <text x="466" y="203" fill="${C.gold2}" font-size="10" font-family="monospace">
    ${(xpCur/xpNeeded*100).toFixed(0)}%
  </text>

  <!-- XP BREAKDOWN LABEL -->
  <text x="36" y="228" fill="${C.muted}" font-size="9.5" font-family="monospace" letter-spacing="1.5">XP BREAKDOWN</text>

  <!-- Achievement -->
  <text x="36" y="252" font-family="serif" font-size="13">🏆</text>
  <text x="56" y="252" fill="${C.text}" font-size="10.5" font-family="monospace">Achievement</text>
  <rect x="158" y="242" width="${rpgW}" height="7" rx="3.5" fill="${C.rim}"/>
  <rect x="158" y="242" width="${rw(d.achieveXp)}" height="7" rx="3.5" fill="url(#ag)"/>
  <text x="${W-36}" y="252" fill="${C.gold}" font-size="10" font-family="monospace" text-anchor="end">${fmtNum(d.achieveXp||0)}</text>

  <!-- Combat -->
  <text x="36" y="274" font-family="serif" font-size="13">⚔️</text>
  <text x="56" y="274" fill="${C.text}" font-size="10.5" font-family="monospace">Combat</text>
  <rect x="158" y="264" width="${rpgW}" height="7" rx="3.5" fill="${C.rim}"/>
  <rect x="158" y="264" width="${rw(d.combatXp)}" height="7" rx="3.5" fill="url(#cg)"/>
  <text x="${W-36}" y="274" fill="${C.danger}" font-size="10" font-family="monospace" text-anchor="end">${fmtNum(d.combatXp||0)}</text>

  <!-- Mission -->
  <text x="36" y="296" font-family="serif" font-size="13">📜</text>
  <text x="56" y="296" fill="${C.text}" font-size="10.5" font-family="monospace">Mission</text>
  <rect x="158" y="286" width="${rpgW}" height="7" rx="3.5" fill="${C.rim}"/>
  <rect x="158" y="286" width="${rw(d.missionXp)}" height="7" rx="3.5" fill="url(#mg)"/>
  <text x="${W-36}" y="296" fill="${C.success}" font-size="10" font-family="monospace" text-anchor="end">${fmtNum(d.missionXp||0)}</text>

  <!-- Dungeon -->
  <text x="36" y="318" font-family="serif" font-size="13">🏟️</text>
  <text x="56" y="318" fill="${C.text}" font-size="10.5" font-family="monospace">Dungeon</text>
  <rect x="158" y="308" width="${rpgW}" height="7" rx="3.5" fill="${C.rim}"/>
  <rect x="158" y="308" width="${rw(d.dungeonXp)}" height="7" rx="3.5" fill="url(#dg)"/>
  <text x="${W-36}" y="318" fill="${C.violet3}" font-size="10" font-family="monospace" text-anchor="end">${fmtNum(d.dungeonXp||0)}</text>

  <!-- divider -->
  <line x1="36" y1="340" x2="${W-36}" y2="340" stroke="${C.gold}" stroke-width=".6" stroke-opacity=".3"/>

  <!-- STATS ROW -->
  <!-- K/D -->
  <rect x="36" y="354" width="168" height="76" rx="12" fill="${C.panel}" stroke="${C.rim}" stroke-width="1"/>
  <text x="120" y="378" text-anchor="middle" fill="${C.muted}" font-size="9.5" font-family="monospace" letter-spacing="1">K/D RATIO</text>
  <text x="120" y="411" text-anchor="middle" fill="${C.gold}" font-size="23" font-weight="700" font-family="'Arial Black',monospace">${esc(d.kd||'0.00')}</text>

  <!-- Matches -->
  <rect x="216" y="354" width="168" height="76" rx="12" fill="${C.panel}" stroke="${C.rim}" stroke-width="1"/>
  <text x="300" y="378" text-anchor="middle" fill="${C.muted}" font-size="9.5" font-family="monospace" letter-spacing="1">MATCHES</text>
  <text x="300" y="411" text-anchor="middle" fill="${C.text}" font-size="23" font-weight="700" font-family="'Arial Black',monospace">${d.matches||0}</text>

  <!-- Rank progress -->
  <rect x="396" y="354" width="188" height="76" rx="12" fill="${C.panel}" stroke="${rc}" stroke-width="1" stroke-opacity=".6"/>
  <text x="490" y="374" text-anchor="middle" fill="${C.muted}" font-size="9.5" font-family="monospace" letter-spacing="1">RANK PROGRESS</text>
  <text x="490" y="398" text-anchor="middle" fill="${rc}" font-size="17" font-weight="700" font-family="monospace">${esc(d.rank||'Bronze')}</text>
  <text x="490" y="417" text-anchor="middle" fill="${C.muted}" font-size="11" font-family="monospace">${d.rankPct||0}% →next</text>

  <!-- divider -->
  <line x1="36" y1="446" x2="${W-36}" y2="446" stroke="${C.gold}" stroke-width=".6" stroke-opacity=".3"/>

  <!-- ECONOMY -->
  <text x="36" y="467" fill="${C.muted}" font-size="9.5" font-family="monospace" letter-spacing="1.5">ECONOMY</text>

  <rect x="36"  y="479" width="128" height="57" rx="10" fill="${C.panel}" stroke="${C.rim}" stroke-width="1"/>
  <text x="100" y="499" text-anchor="middle" fill="${C.muted}" font-size="9" font-family="monospace">💵 WALLET</text>
  <text x="100" y="523" text-anchor="middle" fill="${C.gold2}" font-size="13.5" font-weight="700" font-family="monospace">${fmtNum(d.balance)}</text>

  <rect x="174" y="479" width="128" height="57" rx="10" fill="${C.panel}" stroke="${C.rim}" stroke-width="1"/>
  <text x="238" y="499" text-anchor="middle" fill="${C.muted}" font-size="9" font-family="monospace">🏦 BANK</text>
  <text x="238" y="523" text-anchor="middle" fill="${C.gold2}" font-size="13.5" font-weight="700" font-family="monospace">${fmtNum(d.bank)}</text>

  <rect x="312" y="479" width="118" height="57" rx="10" fill="${C.panel}" stroke="${C.rim}" stroke-width="1"/>
  <text x="371" y="499" text-anchor="middle" fill="${C.muted}" font-size="9" font-family="monospace">💎 GEMS</text>
  <text x="371" y="523" text-anchor="middle" fill="${C.violet3}" font-size="13.5" font-weight="700" font-family="monospace">${d.gems||0}</text>

  <rect x="440" y="479" width="144" height="57" rx="10" fill="${C.panel}" stroke="${C.rim}" stroke-width="1"/>
  <text x="512" y="499" text-anchor="middle" fill="${C.muted}" font-size="9" font-family="monospace">⭐ STARDUST</text>
  <text x="512" y="523" text-anchor="middle" fill="${C.gold3}" font-size="13.5" font-weight="700" font-family="monospace">${d.stardust||0}</text>

  <!-- divider -->
  <line x1="36" y1="552" x2="${W-36}" y2="552" stroke="${C.gold}" stroke-width=".6" stroke-opacity=".3"/>

  <!-- ACTIVITY -->
  <text x="36" y="573" fill="${C.muted}" font-size="9.5" font-family="monospace" letter-spacing="1.5">ACTIVITY</text>

  <rect x="36"  y="585" width="178" height="54" rx="10" fill="${C.panel}" stroke="${C.rim}" stroke-width="1"/>
  <text x="46" y="605" fill="${C.muted}" font-size="9.5" font-family="monospace">🔥 Daily Streak</text>
  <text x="46" y="628" fill="${C.gold}" font-size="17" font-weight="700" font-family="monospace">${d.streak||0} days</text>

  <rect x="226" y="585" width="168" height="54" rx="10" fill="${C.panel}" stroke="${C.rim}" stroke-width="1"/>
  <text x="236" y="605" fill="${C.muted}" font-size="9.5" font-family="monospace">⚔️ RPG Class</text>
  <text x="236" y="628" fill="${C.violet3}" font-size="16" font-weight="700" font-family="monospace">${esc(d.rpgClass||'Warrior')}</text>

  <rect x="406" y="585" width="178" height="54" rx="10" fill="${C.panel}" stroke="${C.rim}" stroke-width="1"/>
  <text x="416" y="605" fill="${C.muted}" font-size="9.5" font-family="monospace">🏟️ Dungeons</text>
  <text x="416" y="628" fill="${C.success}" font-size="17" font-weight="700" font-family="monospace">${d.dungeons||0} clears</text>

  <!-- FOOTER -->
  <rect x="0" y="${H-54}" width="${W}" height="54" fill="${C.panel}" fill-opacity=".85"/>
  <line x1="0" y1="${H-54}" x2="${W}" y2="${H-54}" stroke="url(#gld)" stroke-width="1" stroke-opacity=".6"/>
  <text x="${W/2}" y="${H-25}" text-anchor="middle"
    fill="${C.gold}" font-size="13" font-family="'Arial',sans-serif" letter-spacing="3">
    ⋆☽ Sʜᴀᴅᴏᴡ Gᴀʀᴅᴇɴ ☾⋆
  </text>
  <text x="${W/2}" y="${H-9}" text-anchor="middle"
    fill="${C.faint}" font-size="9" font-family="monospace" letter-spacing="2">
    Powered by Claude AI
  </text>
  <rect x="0" y="${H-2.5}" width="${W}" height="2.5" fill="url(#gld)"/>
</g>
</svg>`;
}

function buildUnregisteredSVG(d){
  const W=620,H=400;
  return`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#070511"/><stop offset="100%" stop-color="#0e0c20"/>
  </linearGradient>
  <linearGradient id="gld" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#7a5f0e"/><stop offset="60%" stop-color="#c9a227"/>
    <stop offset="100%" stop-color="#f5d86e"/>
  </linearGradient>
  <clipPath id="cc"><rect width="${W}" height="${H}" rx="20"/></clipPath>
</defs>
<g clip-path="url(#cc)">
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${Array.from({length:11},(_,i)=>`<line x1="${(i+1)*56}" y1="0" x2="${(i+1)*56}" y2="${H}" stroke="#3d3460" stroke-width=".4" stroke-opacity=".25"/>`).join('')}
  ${Array.from({length:8},(_,i)=>`<line x1="0" y1="${(i+1)*50}" x2="${W}" y2="${(i+1)*50}" stroke="#3d3460" stroke-width=".4" stroke-opacity=".25"/>`).join('')}
  <rect width="${W}" height="2.5" fill="url(#gld)"/>
  <rect y="${H-2.5}" width="${W}" height="2.5" fill="url(#gld)"/>

  <!-- Lock -->
  <circle cx="90" cy="112" r="60" fill="#12102a" stroke="#3d3460" stroke-width="1.5"/>
  <text x="90" y="130" text-anchor="middle" font-family="serif" font-size="50">🔒</text>

  <!-- Text -->
  <text x="178" y="76" fill="#5a526a" font-size="10" font-family="monospace" letter-spacing="3">UNREGISTERED PLAYER</text>
  <text x="178" y="112" fill="#ddd6f8" font-size="27" font-weight="700" font-family="'Arial Black',sans-serif">
    ${esc((d.username||'Unknown').slice(0,22))}
  </text>
  <text x="178" y="138" fill="#7a6fa0" font-size="12" font-family="monospace">NO LEVEL · NO RANK · NO XP</text>
  <rect x="178" y="156" width="218" height="38" rx="10"
    fill="#c9a227" fill-opacity=".1" stroke="#c9a227" stroke-width="1.5"/>
  <text x="287" y="180" text-anchor="middle" fill="#c9a227"
    font-size="12.5" font-weight="700" font-family="monospace" letter-spacing="2">TYPE .register</text>

  <!-- Locked boxes -->
  <rect x="36"  y="236" width="164" height="78" rx="12" fill="#100e24" stroke="#251f4a" stroke-width="1"/>
  <text x="118" y="264" text-anchor="middle" fill="#3d3460" font-size="9.5" font-family="monospace">K/D RATIO</text>
  <text x="118" y="300" text-anchor="middle" font-family="serif" font-size="28">🔒</text>

  <rect x="212" y="236" width="164" height="78" rx="12" fill="#100e24" stroke="#251f4a" stroke-width="1"/>
  <text x="294" y="264" text-anchor="middle" fill="#3d3460" font-size="9.5" font-family="monospace">MATCHES</text>
  <text x="294" y="300" text-anchor="middle" font-family="serif" font-size="28">🔒</text>

  <rect x="388" y="236" width="196" height="78" rx="12" fill="#100e24" stroke="#251f4a" stroke-width="1"/>
  <text x="486" y="264" text-anchor="middle" fill="#3d3460" font-size="9.5" font-family="monospace">RANK</text>
  <text x="486" y="300" text-anchor="middle" font-family="serif" font-size="28">🔒</text>

  <!-- Footer -->
  <rect x="0" y="${H-46}" width="${W}" height="46" fill="#0d0b1e" fill-opacity=".9"/>
  <line x1="0" y1="${H-46}" x2="${W}" y2="${H-46}" stroke="url(#gld)" stroke-width="1" stroke-opacity=".5"/>
  <text x="${W/2}" y="${H-17}" text-anchor="middle"
    fill="#3d3460" font-size="12" font-family="monospace" letter-spacing="3">
    ⋆☽ Sʜᴀᴅᴏᴡ Gᴀʀᴅᴇɴ ☾⋆
  </text>
</g>
</svg>`;
}

async function generateProfileCard(data){
  const svg=data.mode==='unregistered'?buildUnregisteredSVG(data):buildRegisteredSVG(data);
  return sharp(Buffer.from(svg)).png({compressionLevel:8}).toBuffer();
}

module.exports={generateProfileCard};
