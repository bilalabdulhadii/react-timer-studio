import { describe, expect, it, vi } from 'vitest'
import { initiateSrtDownload } from './download.js'

function createDownloadEnvironment({ click = vi.fn() } = {}) {
  const link = { href: '', download: '', click, remove: vi.fn() }
  const documentObject = {
    createElement: vi.fn(() => link),
    body: { append: vi.fn() },
  }
  const urlApi = {
    createObjectURL: vi.fn(() => 'blob:timer-studio-test'),
    revokeObjectURL: vi.fn(),
  }
  return { documentObject, link, urlApi }
}

describe('SRT browser download', () => {
  it('initiates a successful download with the automatic filename', async () => {
    const environment = createDownloadEnvironment()
    const download = initiateSrtDownload(
      { content: '1\n00:00:00,000 --> 00:00:01,000\n00:01\n', filename: 'timer-studio-countdown-1s.srt' },
      environment,
    )

    const blob = environment.urlApi.createObjectURL.mock.calls[0][0]
    expect(blob.type).toBe('application/x-subrip;charset=utf-8')
    expect(await blob.text()).toContain('00:00:00,000 --> 00:00:01,000')
    expect(environment.link.download).toBe('timer-studio-countdown-1s.srt')
    expect(environment.documentObject.body.append).toHaveBeenCalledWith(environment.link)
    expect(environment.link.click).toHaveBeenCalledOnce()
    expect(environment.link.remove).toHaveBeenCalledOnce()

    download.revoke()
    download.revoke()
    expect(environment.urlApi.revokeObjectURL).toHaveBeenCalledOnce()
  })

  it('revokes the temporary URL when the browser rejects the download click', () => {
    const environment = createDownloadEnvironment({ click: vi.fn(() => { throw new Error('blocked') }) })

    expect(() =>
      initiateSrtDownload({ content: 'SRT', filename: 'timer-studio.srt' }, environment),
    ).toThrow('blocked')
    expect(environment.urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:timer-studio-test')
    expect(environment.link.remove).toHaveBeenCalledOnce()
  })

  it('uses a worker-prepared Blob without rebuilding the file in the main thread', () => {
    const environment = createDownloadEnvironment()
    const blob = new Blob(['SRT'], { type: 'application/x-subrip;charset=utf-8' })

    initiateSrtDownload({ blob, filename: 'timer-studio.srt' }, environment)

    expect(environment.urlApi.createObjectURL).toHaveBeenCalledWith(blob)
  })
})
