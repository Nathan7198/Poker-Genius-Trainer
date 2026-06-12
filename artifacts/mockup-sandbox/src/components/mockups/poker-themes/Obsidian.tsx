export function Obsidian() {
  const C = {
    bg: '#0A0A0A',
    surface: '#111111',
    panel: '#0F0F0F',
    felt: '#163224',
    feltEdge: '#0A1E14',
    feltInner: '#1E4A32',
    gold: '#A8882A',
    goldLight: '#C8A840',
    goldDim: '#604E18',
    silver: '#8A8A8A',
    text: '#EEEAE0',
    muted: '#5A6A5A',
    border: '#202020',
    fold: '#4A2020',
    call: '#102840',
    raise: '#402E08',
    red: '#C43030',
  };

  const Card = ({ rank, suit, faceUp = true, size = 'md' }: any) => {
    const isRed = suit === '♥' || suit === '♦';
    const sizes: any = {
      sm: { w: 30, h: 42, fs: 12 },
      md: { w: 38, h: 52, fs: 15 },
      lg: { w: 54, h: 76, fs: 22 },
    };
    const s = sizes[size];
    if (!faceUp) return (
      <div style={{
        width: s.w, height: s.h, borderRadius: 6,
        background: `linear-gradient(145deg, #1C3A28, #0F2019)`,
        border: `1px solid ${C.gold}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.7)',
      }}>
        <div style={{
          width: s.w - 8, height: s.h - 8,
          border: `1px solid ${C.gold}20`,
          borderRadius: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 9, color: C.gold + '60' }}>♣</div>
        </div>
      </div>
    );
    return (
      <div style={{
        width: s.w, height: s.h, borderRadius: 6,
        background: '#FAFAF8',
        border: '1px solid #E0DDD0',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: 4,
          fontSize: s.fs - 6, fontWeight: 900,
          color: isRed ? C.red : '#111', lineHeight: 1,
        }}>{rank}<br/><span style={{ fontSize: s.fs - 9 }}>{suit}</span></div>
        <div style={{ fontSize: s.fs + 2, fontWeight: 400, color: isRed ? C.red : '#111', marginTop: 4 }}>{suit}</div>
      </div>
    );
  };

  const Seat = ({ pos, action, isActive, chips, cards }: any) => {
    const posColors: any = { UTG: '#CC3333', HJ: '#CC7722', CO: '#CCAA22', BTN: '#33AA55', SB: '#3366CC', BB: '#8833CC' };
    const pc = posColors[pos] || C.gold;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: action === 'FOLD' ? 0.35 : 1 }}>
        {action && (
          <div style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6, letterSpacing: 0.3,
            background: `${action === 'FOLD' ? '#4A2020' : action === 'RAISE' ? '#402E08' : '#102840'}88`,
            color: action === 'FOLD' ? '#E07070' : action === 'RAISE' ? C.goldLight : '#60A8E0',
            border: `1px solid ${action === 'FOLD' ? '#6A3030' : action === 'RAISE' ? C.goldDim : '#184060'}`,
          }}>{action}{chips ? ` ${chips}BB` : ''}</div>
        )}
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `linear-gradient(145deg, #1A1A1A, #111)`,
          border: `2px solid ${isActive ? pc : '#2A2A2A'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isActive ? `0 0 12px ${pc}50` : '0 2px 8px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: 8, fontWeight: 800, color: isActive ? pc : C.muted, letterSpacing: 0.5 }}>{pos}</div>
        </div>
        {cards && (
          <div style={{ display: 'flex', gap: 2 }}>
            <Card rank='' suit='' faceUp={false} size='sm' />
            <Card rank='' suit='' faceUp={false} size='sm' />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      width: 390, height: 844,
      background: C.bg,
      fontFamily: '"SF Pro Display", system-ui, -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: C.gold,
            boxShadow: `0 0 8px ${C.gold}`,
          }} />
          <div>
            <div style={{
              fontSize: 12, fontWeight: 700, letterSpacing: 4,
              color: C.text, textTransform: 'uppercase',
            }}>Poker Trainer</div>
          </div>
        </div>
        <div style={{
          padding: '4px 12px', borderRadius: 6,
          background: C.surface,
          border: `1px solid ${C.border}`,
          fontSize: 10, fontWeight: 600, color: C.silver, letterSpacing: 1,
        }}>ADVANCED</div>
      </div>

      {/* Table */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', padding: '0 20px',
      }}>
        {/* Outer ring — clean double border effect */}
        <div style={{
          width: 334, height: 218,
          borderRadius: 109,
          background: C.feltEdge,
          boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 0 1px #2A2A2A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <div style={{
            width: 318, height: 202,
            borderRadius: 101,
            background: `linear-gradient(160deg, #1E4A30, ${C.felt} 50%, #102010)`,
            border: `1px solid ${C.feltInner}60`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            {/* Subtle diamond pattern overlay */}
            <div style={{
              position: 'absolute',
              inset: 0, borderRadius: 101,
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 1px, transparent 1px, transparent 12px)',
              pointerEvents: 'none',
            }} />

            {/* Pot */}
            <div style={{
              padding: '4px 16px', borderRadius: 20,
              background: 'rgba(0,0,0,0.5)',
              border: `1px solid ${C.gold}30`,
              fontSize: 11, fontWeight: 600,
              color: C.goldLight, letterSpacing: 1,
            }}>POT  12.5BB</div>

            {/* Community cards */}
            <div style={{ display: 'flex', gap: 6 }}>
              <Card rank='A' suit='♠' faceUp size='md' />
              <Card rank='K' suit='♥' faceUp size='md' />
              <Card rank='7' suit='♦' faceUp size='md' />
              <div style={{ width: 38, height: 52, borderRadius: 6, background: '#0A0A0A', border: `1px solid #252525`, opacity: 0.6 }} />
              <div style={{ width: 38, height: 52, borderRadius: 6, background: '#0A0A0A', border: `1px solid #252525`, opacity: 0.6 }} />
            </div>
          </div>

          {/* Seats */}
          <div style={{ position: 'absolute', top: -46, left: '50%', transform: 'translateX(-50%)' }}>
            <Seat pos='CO' action='RAISE' chips='6' isActive />
          </div>
          <div style={{ position: 'absolute', left: -48, top: '50%', transform: 'translateY(-50%)' }}>
            <Seat pos='UTG' action='FOLD' />
          </div>
          <div style={{ position: 'absolute', right: -48, top: '50%', transform: 'translateY(-50%)' }}>
            <Seat pos='BTN' action='CALL' />
          </div>
          <div style={{ position: 'absolute', top: -24, left: 26 }}>
            <Seat pos='HJ' action='FOLD' />
          </div>
          <div style={{ position: 'absolute', top: -24, right: 26 }}>
            <Seat pos='SB' cards />
          </div>
        </div>

        {/* Action trail */}
        <div style={{ position: 'absolute', top: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{
            padding: '3px 9px', borderRadius: 6,
            background: '#181818', border: `1px solid ${C.border}`,
            fontSize: 9, color: C.muted, letterSpacing: 0.3,
          }}>CO · RAISED 6BB</div>
          <div style={{ fontSize: 8, color: C.border }}>›</div>
          <div style={{
            padding: '3px 9px', borderRadius: 6,
            background: `${C.gold}18`, border: `1px solid ${C.gold}45`,
            fontSize: 9, color: C.goldLight, fontWeight: 700, letterSpacing: 0.3,
          }}>YOUR TURN</div>
        </div>
      </div>

      {/* Hero cards */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingBottom: 10 }}>
        <div style={{ fontSize: 9, letterSpacing: 2.5, color: C.muted, fontWeight: 500, textTransform: 'uppercase' }}>
          Your Hand
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Card rank='A' suit='♣' faceUp size='lg' />
          <Card rank='K' suit='♠' faceUp size='lg' />
        </div>
      </div>

      {/* Action Panel — clean minimal */}
      <div style={{
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
        padding: '12px 16px 28px',
      }}>
        {/* Info row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 10, padding: '6px 0',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 11, color: C.muted }}>
            CO raised <span style={{ color: C.text }}>6BB</span>
            <span style={{ margin: '0 6px', color: C.border }}>·</span>
            Pot <span style={{ color: C.text }}>12.5BB</span>
          </div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: C.goldLight,
            padding: '2px 8px', borderRadius: 4,
            background: `${C.gold}12`, border: `1px solid ${C.gold}25`,
          }}>6BB to call</div>
        </div>

        {/* Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 2, borderRadius: 1, background: '#1E1E1E', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, width: '38%', height: '100%', borderRadius: 1, background: C.gold }} />
            <div style={{ position: 'absolute', left: '38%', transform: 'translate(-50%, -50%)', top: '50%', width: 14, height: 14, borderRadius: '50%', background: C.goldLight, border: `2px solid ${C.bg}`, boxShadow: `0 0 8px ${C.gold}60` }} />
          </div>
          <div style={{
            minWidth: 64, padding: '4px 10px', borderRadius: 6, textAlign: 'center',
            background: C.bg, border: `1px solid ${C.border}`,
            fontSize: 13, fontWeight: 700, color: C.goldLight,
          }}>18 BB</div>
        </div>

        {/* Quick size chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {['3×', '½', '¾', '1×', '2×'].map(s => (
            <div key={s} style={{
              flex: 1, padding: '5px 0', borderRadius: 6, textAlign: 'center',
              background: s === '½' ? `${C.gold}20` : '#181818',
              border: `1px solid ${s === '½' ? C.gold + '50' : C.border}`,
              fontSize: 10, fontWeight: 600,
              color: s === '½' ? C.goldLight : C.muted,
              cursor: 'pointer',
            }}>{s}</div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            flex: 1, padding: '13px 0', borderRadius: 8,
            background: C.fold, border: `1px solid #6A3030`,
            fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#D08080',
            textTransform: 'uppercase', cursor: 'pointer',
          }}>Fold</button>
          <button style={{
            flex: 1.2, padding: '13px 0', borderRadius: 8,
            background: C.call, border: `1px solid #1A4060`,
            fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#70A8D8',
            textTransform: 'uppercase', cursor: 'pointer',
          }}>Call 6BB</button>
          <button style={{
            flex: 1.5, padding: '13px 0', borderRadius: 8,
            background: `${C.gold}28`, border: `1px solid ${C.gold}60`,
            fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.goldLight,
            textTransform: 'uppercase', cursor: 'pointer',
          }}>Raise 18BB</button>
        </div>
      </div>
    </div>
  );
}
