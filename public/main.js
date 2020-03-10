document.addEventListener('DOMContentLoaded', function() {

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { scope: '/' });
  }
  
  let status = "";
  let filesContainer = document.getElementById('files');
  let uploadButton = document.getElementById('upload-file');
  let reloadButton = document.getElementById('reload-files');

  // Update status text
  function updateStatus(value) {
    let statusText = "Iddle";

    if(value.length) {
      statusText = value;
    }
    
    let statusEl = document.getElementById("status");
    statusEl.textContent = statusText;
  }

  // Update network status
  function updateNetworkStatus(value) {
    let statusOnlineEl = document.getElementById("network-status");
    let statusOnlineTextEl = document.getElementById("status-online-text");

    if(value) {
      statusOnlineEl.className = 'online';
      statusOnlineTextEl.textContent = 'Online';
    } else {
      statusOnlineEl.className = 'offline';
      statusOnlineTextEl.textContent = 'Offline';
    }
  }

  // Update result text
  function updateResult(value) {
    let resultEl = document.getElementById("result");
    resultEl.textContent = value;
  }
  
  // Fetch server fro the files and list them
  function loadServerFiles() {
    if(status.length) {
      return;
    }

    updateStatus("Loading files");

    // Remove all the items from the files list element
    while(filesContainer.firstChild) {
      filesContainer.firstChild.remove();
    }

    fetch("uploads")
      .then(res => {
        return res.json();
      })
      .then(({ success, fromSw, data: files }) => {
        // console.log('files', files, files.length);

        // If respose is not from service worker, then update the cache
        if(!fromSw) {
          caches.open(cacheName).then(cache => cache.put('/uploads', jsonResponse({ success, data: files })));
        }
        
        // Go through all the files and populate the list element
        files.forEach(file => {
          let container = document.createElement('div');
          let a = document.createElement('a');
          let img = document.createElement('img');
          let deleteButton = document.createElement('button');
          
          container.setAttribute('class', 'img-file');

          img.setAttribute('src', `uploads/${file}`);
          a.setAttribute('href', `uploads/${file}`);
          a.setAttribute('target', '_blank');
          a.appendChild(img);

          deleteButton.textContent = "delete";
          deleteButton.addEventListener('click', (event) => {
            deleteFile(file);
          });

          container.appendChild(a);
          container.appendChild(deleteButton);

          filesContainer.appendChild(container);

          // If respose is not from service worker, then update the cache with the file location
          if(!fromSw) {
            caches.open(cacheName).then(cache => cache.add(`/uploads/${file}`));
          }
        });
      })
      .catch(err => console.warn('Error while fetch uploads', err))
      .finally(() => updateStatus(''));
  }

  // Delete a file when a delete button is pressed
  function deleteFile(file) {
    if(status.length) {
      return;
    }

    updateStatus(`Deleting file "${file}"`);

    fetch(`https://pwasndbx.zikro.gr/uploads/${file}`, {
      method: 'DELETE',
      headers: {
        'X-Filename': file
      },
    })
    .then(res => {
      // console.log('fetch delete ok', res);

      if(res.status === 200) {
        updateResult(`File "${file}" deleted`);
      } else {
        updateResult(`Could not delete file "${file}"`);
      }

      loadServerFiles();
    })
    .catch(err => console.warn('Error white fetch delete', err))
    .finally(() => updateStatus(''));
  }
  
  // Upload a file to the server and reload
  function uploadFile() {
    if(status.length) {
      return;
    }

    let fileEl = document.getElementById('file-to-upload');
    
    if(fileEl.files.length) {
      let [file] = fileEl.files;

      updateStatus(`Uploading file "${file.name}"`);
      
      fetch(`/uploads/${file.name}`, {
        method: 'PUT',
        headers: {
          'X-Filename': file.name,
          'X-Mimetype': file.type
        },
        body: file
      })
      .then(res => res.json())
      .then(res => {
        // console.log('fetch put ok', res);
        
        if(res.status === 409) {
          updateResult(`File "${file.name} already exists"`);
        } else {
          updateResult(`File "${file.name} uploaded"`);
          document.getElementById('file-to-upload').value = '';
        }
      })
      .catch(err => console.warn('fetch put err', err))
      .finally(() => {
        updateStatus('');
        loadServerFiles();
      });
    }
  }
  
  updateStatus(status);
  loadServerFiles();

  uploadButton.addEventListener('click', uploadFile);
  reloadButton.addEventListener('click', loadServerFiles);

  window.addEventListener('online', doSync);
  window.addEventListener('offline', () => updateNetworkStatus(false));

  async function doSync() {
    updateNetworkStatus(true);
    updateStatus("Syncing");

    // Get the sync data from cache
    const syncRes = await caches.match(new Request(syncName), { cacheName: syncCacheName });
    const sync = await syncRes.json();

    // If the are pending files send them to the server
    if(sync.pending && sync.pending.length) {
      console.log('sync:pending', sync.pending);

      sync.pending.forEach(async (file) => {
        const url = `/uploads/${file}`;
        const fileRes = await caches.match(url);
        const data = await fileRes.blob();

        console.log('sync:pending:PUT', url, data.length);

        fetch(url, {
          method: 'PUT',
          headers: {
            'X-Filename': file,
            'X-Syncing': 'syncing'
          },
          body: data
        }).catch(err => console.log('sync:pending:PUT:err', file, err));
      });
    } else {
      console.log('sync:pending:no-files');
    }

    // If the are deleted files send delete request to the server
    if(sync.deleted && sync.deleted.length) {
      console.log('sync:deleted', sync.deleted);

      sync.deleted.forEach(async (file) => {
        const url = `/uploads/${file}`;

        console.log('sync:deleted:DELETE', url);

        fetch(url, {
          method: 'DELETE',
          headers: {
            'X-Filename': file,
            'X-Syncing': 'syncing'
          }
        }).catch(err => console.log('sync:deleted:DELETE:err', file, err));
      });
    } else {
      console.log('sync:deleted:no-files');
    }

    // Update and reset the sync cache object
    caches.open(syncCacheName).then(cache => cache.put(syncName, jsonResponse({
      pending: [],
      deleted: []
    })));

    updateStatus('');
  }

});
