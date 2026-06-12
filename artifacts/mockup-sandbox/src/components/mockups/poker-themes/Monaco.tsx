export function Monaco() {
  const C = {
    bg: '#070707',
    surface: '#0E0E0E',
    panel: '#111111',
    felt: '#16432A',
    feltEdge: '#0A2B18',
    feltInner: '#1C5234',
    gold: '#D4AF37',
    goldLight: '#F0CE6A',
    goldDim: '#8B6914',
    text: '#F2EDD8',
    muted: '#8A9E8A',
    border: '#2A2A2A',
    fold: '#6B2929',
    call: '#163860',
    raise: '#6B4E10',
    red: '#CC3333',
  };

  const Card = ({ rank, suit, faceUp = true, size = 'md' }: any) => {
    const isRed = suit === '♥' || suit === '♦';
    const sizes: any = {
      sm: { w: 28, h: 40, fs: 11 },
      md: { w: 36, h: 50, fs: 14 },
      lg: { w: 52, h: 72, fs: 20 },
    };
    const s = sizes[size];
    if (!faceUp) return (
      <div style={{
        width: s.w, height: s.h, borderRadius: 4,
        background: 'linear-gradient(145deg, #1A5E34, #0F3A1F)',
        border: `1px solid ${C.gold}60`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
      }}>
        <div style={{ fontSize: 10, color: C.gold + '80', fontWeight: 800 }}>♦</div>
      </div>
    );
    return (
      <div style={{
        width: s.w, height: s.h, borderRadius: 4,
        background: 'linear-gradient(145deg, #FAFAF5, #F0EDE0)',
        border: '1px solid #C8C4B0',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 3px 10px rgba(0,0,0,0.5)',
        position: 'relative',
      }}>
        <div style={{ fontSize: s.fs, fontWeight: 900, color: isRed ? C.red : '#1A1A1A', lineHeight: 1 }}>{rank}</div>
        <div style={{ fontSize: s.fs - 2, color: isRed ? C.red : '#1A1A1A', lineHeight: 1 }}>{suit}</div>
      </div>
    );
  };

  const Seat = ({ pos, action, chips, cards, isActive }: any) => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      opacity: action === 'FOLD' ? 0.4 : 1,
    }}>
      {action && (
        <div style={{
          fontSize: 9, fontWeight: 700, paddingHorizontal: 6, padding: '2px 6px',
          borderRadius: 8, letterSpacing: 0.5,
          background: action === 'FOLD' ? '#6B292940' : action === 'RAISE' ? C.raise + '60' : '#16386060',
          color: action === 'FOLD' ? '#CC5555' : action === 'RAISE' ? C.goldLight : '#5599DD',
          border: `1px solid ${action === 'FOLD' ? '#6B292970' : action === 'RAISE' ? C.gold + '50' : '#1A4A8050'}`,
        }}>{action} {chips && `${chips}BB`}</div>
      )}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: `linear-gradient(135deg, ${C.surface}, #1A1A1A)`,
        border: `2px solid ${isActive ? C.gold : C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isActive ? `0 0 12px ${C.gold}60` : '0 2px 6px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: isActive ? C.gold : C.muted }}>
          {pos}
        </div>
      </div>
      {cards && (
        <div style={{ display: 'flex', gap: 2 }}>
          <Card rank='?' suit='?' faceUp={false} size='sm' />
          <Card rank='?' suit='?' faceUp={false} size='sm' />
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      width: 390, height: 844,
      background: C.bg,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Subtle vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
      }} />

      {/* Header */}
      <div style={{
        padding: '16px 20px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
      }}>
        <div>
          <div style={{
            fontSize: 13, fontWeight: 800, letterSpacing: 3.5,
            color: C.gold, textTransform: 'uppercase',
          }}>Poker Trainer</div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginTop: 1 }}>6-MAX CASH GAME</div>
        </div>
        <div style={{
          padding: '5px 12px', borderRadius: 20,
          background: 'linear-gradient(135deg, #1A1A1A, #222)',
          border: `1px solid ${C.gold}50`,
          fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 1.5,
        }}>ADV</div>
      </div>

      {/* Table area */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 20px',
        position: 'relative',
      }}>
        {/* Outer table ring */}
        <div style={{
          width: 330, height: 215,
          borderRadius: 108,
          background: `linear-gradient(180deg, ${C.feltEdge}, #082016)`,
          boxShadow: '0 12px 48px rgba(0,0,0,0.85), 0 0 0 1px #D4AF3720, inset 0 1px 0 rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {/* Inner felt */}
          <div style={{
            width: 306, height: 191,
            borderRadius: 96,
            background: `radial-gradient(ellipse at 50% 30%, #1E5C36, ${C.felt} 60%, #122B1C)`,
            border: `2px dashed ${C.feltInner}90`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 10,
          }}>
            {/* Pot */}
            <div style={{
              padding: '3px 14px', borderRadius: 20,
              background: 'rgba(0,0,0,0.55)',
              border: `1px solid ${C.gold}35`,
              fontSize: 11, fontWeight: 700,
              color: C.goldLight, letterSpacing: 0.5,
            }}>POT: 12.5BB</div>

            {/* Community cards */}
            <div style={{ display: 'flex', gap: 5 }}>
              <Card rank='A' suit='♠' faceUp size='md' />
              <Card rank='K' suit='♥' faceUp size='md' />
              <Card rank='7' suit='♦' faceUp size='md' />
              <div style={{
                width: 36, height: 50, borderRadius: 4,
                background: '#0F0F0F', border: `1px dashed ${C.gold}25`,
                opacity: 0.5,
              }} />
              <div style={{
                width: 36, height: 50, borderRadius: 4,
                background: '#0F0F0F', border: `1px dashed ${C.gold}25`,
                opacity: 0.5,
              }} />
            </div>
          </div>

          {/* Top seat */}
          <div style={{ position: 'absolute', top: -42, left: '50%', transform: 'translateX(-50%)' }}>
            <Seat pos='CO' action='RAISE' chips='6' isActive />
          </div>
          {/* Left seat */}
          <div style={{ position: 'absolute', left: -42, top: '50%', transform: 'translateY(-50%)' }}>
            <Seat pos='UTG' action='FOLD' />
          </div>
          {/* Right seat */}
          <div style={{ position: 'absolute', right: -42, top: '50%', transform: 'translateY(-50%)' }}>
            <Seat pos='BTN' action='CALL' isActive />
          </div>
          {/* Top-left */}
          <div style={{ position: 'absolute', top: -20, left: 30 }}>
            <Seat pos='HJ' action='FOLD' />
          </div>
          {/* Top-right */}
          <div style={{ position: 'absolute', top: -20, right: 30 }}>
            <Seat pos='SB' cards />
          </div>
        </div>

        {/* Preflop trail */}
        <div style={{
          position: 'absolute', top: 8,
          display: 'flex', gap: 5, alignItems: 'center',
        }}>
          <div style={{
            padding: '3px 8px', borderRadius: 10,
            background: '#1A361860', border: `1px solid ${C.gold}30`,
            fontSize: 9, color: C.muted,
          }}>CO RAISED 6BB</div>
          <div style={{ fontSize: 8, color: C.muted }}>›</div>
          <div style={{
            padding: '3px 8px', borderRadius: 10,
            background: `${C.gold}20`, border: `1px solid ${C.gold}50`,
            fontSize: 9, color: C.gold, fontWeight: 700,
          }}>YOUR TURN</div>
        </div>
      </div>

      {/* Hero cards */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        paddingBottom: 12,
      }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>
          Your Hand · BTN
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Card rank='A' suit='♣' faceUp size='lg' />
          <Card rank='K' suit='♠' faceUp size='lg' />
        </div>
      </div>

      {/* Action Panel */}
      <div style={{
        background: `linear-gradient(180deg, ${C.surface}F0, ${C.panel} 20%)`,
        borderTop: `1px solid ${C.gold}25`,
        padding: '12px 16px 28px',
      }}>
        {/* Context banner */}
        <div style={{
          padding: '6px 12px', borderRadius: 8, marginBottom: 10,
          background: '#1A1A1A',
          border: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 11, color: C.muted }}>CO raised 6BB <span style={{ color: C.text }}>• Pot 12.5BB</span></div>
          <div style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}>Call = 6BB</div>
        </div>

        {/* Bet slider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        }}>
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#222', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, width: '40%', height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold})` }} />
          </div>
          <div style={{
            padding: '4px 12px', borderRadius: 8,
            background: '#1A1A1A', border: `1px solid ${C.gold}40`,
            fontSize: 12, fontWeight: 700, color: C.goldLight, minWidth: 60, textAlign: 'center',
          }}>18 BB</div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            flex: 1, padding: '13px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: `linear-gradient(180deg, #7A3232, ${C.fold})`,
            boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 12px rgba(0,0,0,0.4)',
            fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: '#F08080',
            textTransform: 'uppercase',
          }}>Fold</button>
          <button style={{
            flex: 1.2, padding: '13px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: `linear-gradient(180deg, #1E4A7A, ${C.call})`,
            boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 12px rgba(0,0,0,0.4)',
            fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: '#80BBFF',
            textTransform: 'uppercase',
          }}>Call 6BB</button>
          <button style={{
            flex: 1.4, padding: '13px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: `linear-gradient(180deg, ${C.gold}, ${C.goldDim})`,
            boxShadow: '0 1px 0 rgba(255,255,255,0.2) inset, 0 4px 16px rgba(212,175,55,0.25)',
            fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: '#1A1200',
            textTransform: 'uppercase',
          }}>Raise 18BB</button>
        </div>
      </div>
    </div>
  );
}
