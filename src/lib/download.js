export function initiateSrtDownload(
  { content, blob, filename },
  { documentObject = globalThis.document, urlApi = globalThis.URL } = {},
) {
  const srtBlob = blob ?? new Blob([content], { type: 'application/x-subrip;charset=utf-8' })
  const objectUrl = urlApi.createObjectURL(srtBlob)
  let link

  try {
    link = documentObject.createElement('a')
    link.href = objectUrl
    link.download = filename
    documentObject.body.append(link)
    link.click()
  } catch (error) {
    urlApi.revokeObjectURL(objectUrl)
    throw error
  } finally {
    link?.remove()
  }

  let revoked = false
  return {
    objectUrl,
    revoke() {
      if (revoked) return
      revoked = true
      urlApi.revokeObjectURL(objectUrl)
    },
  }
}
