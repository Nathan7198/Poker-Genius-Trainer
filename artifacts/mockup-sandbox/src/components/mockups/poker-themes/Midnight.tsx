export function Midnight() {
  const C = {
    bg: '#060912',
    surface: '#0A0E1C',
    panel: '#0C1020',
    felt: '#0E2744',
    feltEdge: '#081428',
    feltInner: '#163660',
    gold: '#C8A220',
    goldLight: '#E8C040',
    goldDim: '#705A10',
    text: '#E8E4F0',
    muted: '#6A7AA0',
    border: '#1A2040',
    fold: '#5C1A2E',
    call: '#0E3060',
    raise: '#5C4210',
    red: '#D94455',
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
        width: s.w, height: s.h, borderRadius: 5,
        background: 'linear-gradient(145deg, #1A2E5C, #0E1C3A)',
        border: `1px solid ${C.gold}50`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.7)',
      }}>
        <div style={{ fontSize: 10, color: C.gold + '70' }}>◆</div>
      </div>
    );
    return (
      <div style={{
        width: s.w, height: s.h, borderRadius: 5,
        background: 'linear-gradient(145deg, #FFFFFF, #F4F0FF)',
        border: '1px solid #D0CCEE',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px ${C.gold}20`,
        position: 'relative',
      }}>
        <div style={{ fontSize: s.fs, fontWeight: 900, color: isRed ? C.red : '#18182A', lineHeight: 1 }}>{rank}</div>
        <div style={{ fontSize: s.fs - 2, color: isRed ? C.red : '#18182A', lineHeight: 1 }}>{suit}</div>
      </div>
    );
  };

  const Seat = ({ pos, action, isActive, cards }: any) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, opacity: action === 'FOLD' ? 0.4 : 1 }}>
      {action && (
        <div style={{
          fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, letterSpacing: 0.5,
          background: action === 'FOLD' ? '#5C1A2E40' : action === 'RAISE' ? `${C.gold}20` : '#0E306050',
          color: action === 'FOLD' ? '#E05070' : action === 'RAISE' ? C.goldLight : '#50A0F0',
          border: `1px solid ${action === 'FOLD' ? '#5C1A2E60' : action === 'RAISE' ? `${C.gold}40` : '#0E306080'}`,
        }}>{action}</div>
      )}
      <div style={{
        width: 38, height: 38, borderRadius: '50%',
        background: `linear-gradient(135deg, #0E1428, #16203C)`,
        border: `2px solid ${isActive ? C.gold : '#1E2A50'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isActive ? `0 0 16px ${C.gold}50` : '0 2px 8px rgba(0,0,0,0.6)',
      }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: isActive ? C.gold : C.muted }}>{pos}</div>
      </div>
      {cards && (
        <div style={{ display: 'flex', gap: 2 }}>
          <Card rank='' suit='' faceUp={false} size='sm' />
          <Card rank='' suit='' faceUp={false} size='sm' />
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      width: 390, height: 844,
      background: `radial-gradient(ellipse at 50% 0%, #0E1428, ${C.bg} 60%)`,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Star-like specks */}
      {[...Array(12)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${(i * 37 + 10) % 100}%`,
          top: `${(i * 53 + 5) % 45}%`,
          width: i % 3 === 0 ? 2 : 1,
          height: i % 3 === 0 ? 2 : 1,
          borderRadius: '50%',
          background: C.gold,
          opacity: 0.15 + (i % 4) * 0.08,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Header */}
      <div style={{
        padding: '16px 20px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: `linear-gradient(180deg, #0E142800, transparent)`,
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div>
          <div style={{
            fontSize: 13, fontWeight: 800, letterSpacing: 3.5,
            background: `linear-gradient(90deg, ${C.goldLight}, ${C.gold})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            textTransform: 'uppercase',
          }}>Poker Trainer</div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginTop: 1 }}>MIDNIGHT TABLE</div>
        </div>
        <div style={{
          padding: '5px 12px', borderRadius: 20,
          background: `linear-gradient(135deg, ${C.gold}20, ${C.gold}08)`,
          border: `1px solid ${C.gold}60`,
          fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
          background2: 'transparent',
          color: C.goldLight,
        }}>ADV</div>
      </div>

      {/* Table area */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', padding: '0 20px',
      }}>
        {/* Table glow */}
        <div style={{
          position: 'absolute',
          width: 340, height: 220,
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${C.gold}08 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Table */}
        <div style={{
          width: 330, height: 210,
          borderRadius: 105,
          background: `linear-gradient(180deg, ${C.feltEdge}, #040A18)`,
          boxShadow: `0 16px 60px rgba(0,0,0,0.9), 0 0 0 1px ${C.gold}25, 0 0 40px ${C.gold}08`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <div style={{
            width: 306, height: 186,
            borderRadius: 93,
            background: `radial-gradient(ellipse at 50% 30%, #163060, ${C.felt} 65%, #080E22)`,
            border: `1.5px solid ${C.feltInner}`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            {/* Pot */}
            <div style={{
              padding: '3px 14px', borderRadius: 20,
              background: 'rgba(0,0,0,0.6)',
              border: `1px solid ${C.gold}30`,
              fontSize: 11, fontWeight: 700,
              color: C.goldLight, letterSpacing: 0.5,
            }}>POT: 12.5BB</div>

            {/* Community cards */}
            <div style={{ display: 'flex', gap: 5 }}>
              <Card rank='A' suit='♠' faceUp size='md' />
              <Card rank='K' suit='♥' faceUp size='md' />
              <Card rank='7' suit='♦' faceUp size='md' />
              <div style={{ width: 36, height: 50, borderRadius: 5, background: '#080E1C', border: `1px dashed ${C.gold}20`, opacity: 0.5 }} />
              <div style={{ width: 36, height: 50, borderRadius: 5, background: '#080E1C', border: `1px dashed ${C.gold}20`, opacity: 0.5 }} />
            </div>
          </div>

          {/* Seats */}
          <div style={{ position: 'absolute', top: -44, left: '50%', transform: 'translateX(-50%)' }}>
            <Seat pos='CO' action='RAISE' isActive />
          </div>
          <div style={{ position: 'absolute', left: -44, top: '50%', transform: 'translateY(-50%)' }}>
            <Seat pos='UTG' action='FOLD' />
          </div>
          <div style={{ position: 'absolute', right: -44, top: '50%', transform: 'translateY(-50%)' }}>
            <Seat pos='BTN' action='CALL' />
          </div>
          <div style={{ position: 'absolute', top: -22, left: 28 }}>
            <Seat pos='HJ' action='FOLD' />
          </div>
          <div style={{ position: 'absolute', top: -22, right: 28 }}>
            <Seat pos='SB' cards />
          </div>
        </div>

        {/* Action trail */}
        <div style={{ position: 'absolute', top: 8, display: 'flex', gap: 5, alignItems: 'center' }}>
          <div style={{
            padding: '3px 8px', borderRadius: 10,
            background: '#12182840', border: `1px solid ${C.gold}25`,
            fontSize: 9, color: C.muted,
          }}>CO RAISED 6BB</div>
          <div style={{ fontSize: 8, color: C.muted }}>›</div>
          <div style={{
            padding: '3px 8px', borderRadius: 10,
            background: `${C.gold}18`, border: `1px solid ${C.gold}55`,
            fontSize: 9, color: C.gold, fontWeight: 700,
          }}>YOUR TURN</div>
        </div>
      </div>

      {/* Hero cards */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingBottom: 12 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: C.muted, fontWeight: 600 }}>YOUR HAND · BTN</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Card rank='A' suit='♣' faceUp size='lg' />
          <Card rank='K' suit='♠' faceUp size='lg' />
        </div>
      </div>

      {/* Action Panel */}
      <div style={{
        background: `linear-gradient(0deg, ${C.panel}, ${C.surface})`,
        borderTop: `1px solid ${C.gold}20`,
        padding: '12px 16px 28px',
      }}>
        <div style={{
          padding: '6px 12px', borderRadius: 8, marginBottom: 10,
          background: '#0A0E1C',
          border: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 11, color: C.muted }}>CO raised 6BB <span style={{ color: C.text }}>• Pot 12.5BB</span></div>
          <div style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}>Call = 6BB</div>
        </div>

        {/* Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#1A2040', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, width: '40%', height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold})` }} />
            <div style={{ position: 'absolute', left: '40%', transform: 'translateX(-50%) translateY(-50%)', top: '50%', width: 12, height: 12, borderRadius: '50%', background: C.goldLight, boxShadow: `0 0 8px ${C.gold}80` }} />
          </div>
          <div style={{
            padding: '4px 12px', borderRadius: 8,
            background: '#0E1428', border: `1px solid ${C.gold}40`,
            fontSize: 12, fontWeight: 700, color: C.goldLight, minWidth: 60, textAlign: 'center',
          }}>18 BB</div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            flex: 1, padding: '14px 0', borderRadius: 12, border: `1px solid #8C2A4060`, cursor: 'pointer',
            background: `linear-gradient(180deg, #6E2038, ${C.fold})`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: '#F08898', textTransform: 'uppercase',
          }}>Fold</button>
          <button style={{
            flex: 1.2, padding: '14px 0', borderRadius: 12, border: `1px solid #1A4A9060`, cursor: 'pointer',
            background: `linear-gradient(180deg, #163C80, ${C.call})`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: '#80B8FF', textTransform: 'uppercase',
          }}>Call 6BB</button>
          <button style={{
            flex: 1.4, padding: '14px 0', borderRadius: 12, border: `1px solid ${C.gold}50`, cursor: 'pointer',
            background: `linear-gradient(180deg, ${C.gold}E0, ${C.goldDim})`,
            boxShadow: `0 4px 16px ${C.gold}30`,
            fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: '#180E00', textTransform: 'uppercase',
          }}>Raise 18BB</button>
        </div>
      </div>
    </div>
  );
}
