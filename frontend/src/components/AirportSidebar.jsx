import { useEffect, useState } from 'react'
import { REGION_HEX } from './GraphViewer.jsx'

const AIRPORT_INFO = {
  MAO: { nome: 'Aeroporto Int. Eduardo Gomes',             inaugurado: 1976, passageiros: 4_500_000,  operacoes: 50_000,  lat: -3.0386,  lon: -60.0498 },
  BEL: { nome: 'Aeroporto Int. Val-de-Cans',               inaugurado: 1944, passageiros: 4_300_000,  operacoes: 48_000,  lat: -1.3792,  lon: -48.4763 },
  PVH: { nome: 'Aeroporto Gov. Jorge Teixeira',            inaugurado: 1971, passageiros: 1_800_000,  operacoes: 22_000,  lat: -8.7094,  lon: -63.9024 },
  RBR: { nome: 'Aeroporto Int. Plácido de Castro',         inaugurado: 1956, passageiros:   900_000,  operacoes: 12_000,  lat: -9.8691,  lon: -67.8980 },
  REC: { nome: 'Aeroporto Int. do Recife/Guararapes',      inaugurado: 1955, passageiros: 8_500_000,  operacoes: 90_000,  lat: -8.1259,  lon: -34.9228 },
  SSA: { nome: 'Aeroporto Int. Luís Eduardo Magalhães',    inaugurado: 1998, passageiros: 9_700_000,  operacoes: 100_000, lat: -12.9086, lon: -38.3225 },
  FOR: { nome: 'Aeroporto Int. Pinto Martins',             inaugurado: 1998, passageiros: 8_600_000,  operacoes: 95_000,  lat: -3.7762,  lon: -38.5326 },
  NAT: { nome: 'Aeroporto Int. Gov. Aluízio Alves',        inaugurado: 2014, passageiros: 3_200_000,  operacoes: 30_000,  lat: -5.7691,  lon: -35.3769 },
  JPA: { nome: 'Aeroporto Int. Castro Pinto',              inaugurado: 1935, passageiros: 2_500_000,  operacoes: 26_000,  lat: -7.1458,  lon: -34.9501 },
  THE: { nome: 'Aeroporto Int. Senador Petrônio Portella', inaugurado: 1980, passageiros: 1_700_000,  operacoes: 18_000,  lat: -5.0599,  lon: -42.8235 },
  BSB: { nome: 'Aeroporto Int. de Brasília – JK',          inaugurado: 1967, passageiros: 18_500_000, operacoes: 185_000, lat: -15.8711, lon: -47.9186 },
  GYN: { nome: 'Aeroporto Santa Genoveva',                 inaugurado: 1955, passageiros: 4_200_000,  operacoes: 55_000,  lat: -16.6320, lon: -49.2207 },
  GRU: { nome: 'Aeroporto Int. de Guarulhos',              inaugurado: 1985, passageiros: 36_100_000, operacoes: 287_000, lat: -23.4356, lon: -46.4731 },
  CGH: { nome: 'Aeroporto de Congonhas',                   inaugurado: 1936, passageiros: 20_500_000, operacoes: 165_000, lat: -23.6262, lon: -46.6556 },
  GIG: { nome: 'Aeroporto Int. do Galeão',                 inaugurado: 1977, passageiros: 16_100_000, operacoes: 130_000, lat: -22.8099, lon: -43.2505 },
  CNF: { nome: 'Aeroporto Int. de Confins',                inaugurado: 1984, passageiros: 11_500_000, operacoes: 112_000, lat: -19.6244, lon: -43.9719 },
  VIX: { nome: 'Aeroporto de Vitória – Eurico Salles',     inaugurado: 1960, passageiros: 3_600_000,  operacoes: 42_000,  lat: -20.2580, lon: -40.2863 },
  CWB: { nome: 'Aeroporto Int. Afonso Pena',               inaugurado: 1950, passageiros: 10_200_000, operacoes: 110_000, lat: -25.5285, lon: -49.1758 },
  FLN: { nome: 'Aeroporto Int. Hercílio Luz',              inaugurado: 1927, passageiros: 5_800_000,  operacoes: 65_000,  lat: -27.6702, lon: -48.5477 },
  POA: { nome: 'Aeroporto Int. Salgado Filho',             inaugurado: 1940, passageiros: 9_700_000,  operacoes: 105_000, lat: -29.9943, lon: -51.1714 },
}

function aerialUrl(lat, lon) {
  const dLon = 0.024
  const dLat = 0.013
  return (
    'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export' +
    `?bbox=${lon - dLon},${lat - dLat},${lon + dLon},${lat + dLat}` +
    '&bboxSR=4326&size=480,200&format=jpg&f=image'
  )
}

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + ' M'
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' K'
  return String(n)
}

function PlaneIcon({ color }) {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"
        fill={color}
        opacity="0.65"
      />
    </svg>
  )
}

function StatRow({ label, value, color }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      borderRadius: 4,
      border: '1px solid rgba(255,255,255,0.05)',
      padding: '7px 10px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{
        fontFamily: "'ui-sans-serif', monospace",
        fontWeight: 900, fontSize: 9,
        color: '#2a4060', letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'ui-sans-serif', monospace",
        fontWeight: 900, fontSize: 13, color,
      }}>
        {value}
      </span>
    </div>
  )
}

export default function AirportSidebar({ iata, node, onClose }) {
  const [imgFailed, setFailed] = useState(false)

  const info   = iata ? AIRPORT_INFO[iata] : null
  const color  = node ? (REGION_HEX[node.regiao] ?? '#64748b') : '#64748b'
  const imgSrc = info ? aerialUrl(info.lat, info.lon) : null

  useEffect(() => { setFailed(false) }, [iata])

  if (!iata || !node) return null

  return (
    <div style={{
      width: 256,
      flexShrink: 0,
      background: '#060d1c',
      borderRight: `1px solid ${color}33`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'relative', height: 148, flexShrink: 0, background: '#040810' }}>
        {imgSrc && !imgFailed ? (
          <img
            src={imgSrc}
            alt={iata}
            onError={() => setFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.82 }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `radial-gradient(ellipse at 50% 60%, ${color}1a 0%, #040810 70%)`,
          }}>
            <PlaneIcon color={color} />
          </div>
        )}

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(4,8,16,0.92))',
          padding: '18px 10px 8px',
        }} />

        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: 'rgba(3,6,16,0.82)',
          borderRadius: 4,
          border: `1px solid ${color}55`,
          padding: '2px 10px',
          fontFamily: "'ui-sans-serif', monospace",
          fontWeight: 900, fontSize: 19,
          color, letterSpacing: 3,
        }}>
          {iata}
        </div>

        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(3,6,16,0.82)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3, color: '#4a6070',
            cursor: 'pointer',
            width: 22, height: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 900, lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
        <p style={{
          fontFamily: "'ui-sans-serif', monospace",
          fontWeight: 900, fontSize: 9,
          color, letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          {node.regiao}
        </p>

        <p style={{
          fontFamily: "'ui-sans-serif', monospace",
          fontWeight: 700, fontSize: 12,
          color: '#94a3b8', lineHeight: 1.4,
          marginBottom: 3,
        }}>
          {info?.nome ?? node.cidade}
        </p>

        <p style={{
          fontFamily: "'ui-sans-serif', monospace",
          fontWeight: 700, fontSize: 10,
          color: '#2a4060',
          marginBottom: 14,
        }}>
          {node.cidade}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <StatRow label="Inaugurado"      value={info?.inaugurado  ?? '—'}              color={color} />
          <StatRow label="Passageiros/ano" value={info ? fmt(info.passageiros) : '—'}    color={color} />
          <StatRow label="Operações/ano"   value={info ? fmt(info.operacoes)   : '—'}    color={color} />
          <StatRow label="Grau no grafo"   value={node.grau ?? '—'}                      color={color} />
        </div>
      </div>

      <div style={{
        padding: '6px 12px',
        borderTop: `1px solid ${color}18`,
        fontFamily: "'ui-sans-serif', monospace",
        fontWeight: 900, fontSize: 8,
        color: '#1a2a30', letterSpacing: 2,
        textAlign: 'center',
      }}>
        FONTE: ANAC · WIKIPEDIA · 2023
      </div>
    </div>
  )
}
