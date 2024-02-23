export const uriDecode = (uri: string) => {
  const uris = uri.split('?')
  if (uris.length <= 1) {
    return {
      path: uris[0],
      query: {}
    }
  } else {
    const arr = uris[1].split('&')
    const query: Record<string, string> = {}
    for (const item of arr) {
      const kv = item.split('=')
      if (kv[1] !== null && kv[1] !== undefined && kv[1] !== '') {
        query[kv[0]] = kv[1]
      }
    }
    return {
      path: uris[0],
      query
    }
  }
}
