export type OverlayPreset = 'none' | 'frame' | 'heart' | 'confetti' | 'text'

interface OverlaySelectorProps {
  selected: OverlayPreset
  onChange: (overlay: OverlayPreset) => void
  label?: string
}

const OVERLAYS: { id: OverlayPreset; label: string; icon: string }[] = [
  { id: 'none', label: 'Tanpa', icon: '⛔' },
  { id: 'frame', label: 'Frame', icon: '🖼️' },
  { id: 'heart', label: 'Heart', icon: '❤️' },
  { id: 'confetti', label: 'Confetti', icon: '✨' },
  { id: 'text', label: 'Text', icon: '📸' },
]

export default function OverlaySelector({ selected, onChange, label = 'Pilih overlay' }: OverlaySelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-400 block">{label}</label>
      <div className="grid grid-cols-5 gap-2">
        {OVERLAYS.map((overlay) => (
          <button
            key={overlay.id}
            type="button"
            onClick={() => onChange(overlay.id)}
            className={`px-2 py-3 rounded-lg border text-xs font-medium transition flex flex-col items-center gap-1 ${
              selected === overlay.id
                ? 'border-white bg-white/10 text-white shadow-sm'
                : 'border-gray-600/50 bg-gray-800/30 text-gray-400 hover:border-gray-500 hover:text-gray-200'
            }`}
          >
            <span className="text-lg leading-none">{overlay.icon}</span>
            <span>{overlay.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
