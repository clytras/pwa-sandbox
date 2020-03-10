const cacheName = 'pwasndbx';
const syncCacheName = 'pwasndbx-sync';

const syncName = '__sync';
const pendingName = '__pending';

function jsonResponse(data, status = 200) {
  return new Response(data && JSON.stringify(data), {
    status,
    headers: {'Content-Type': 'application/json'}
  });
}
