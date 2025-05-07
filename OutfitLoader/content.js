(function() {
    'use strict';

    const userId = window.location.pathname.split('/')[2];

    const addOutfitButton = () => {
        const buttonContainer = document.querySelector('.profile-header-buttons');
        if (!buttonContainer) return;
        const newButton = document.createElement('button');
        newButton.className = 'MuiButtonBase-root MuiButton-root web-blox-css-tss-ixzjnb-Typography-buttonMedium MuiButton-contained web-blox-css-tss-lo77dr-Button-contained MuiButton-containedPrimary MuiButton-sizeMedium';
        newButton.innerHTML = `<span class="web-blox-css-tss-1283320-Button-textContainer">Outfits</span>`;
        buttonContainer.prepend(newButton);
        newButton.addEventListener('click', () => createOutfitModal());
    };

    const fetchOutfitIds = async () => {
        try {
            const uniqueOutfitIds = new Set();
            let allOutfits = [];
            let totalPages = 1;
            const firstPageResponse = await fetch(`https://avatar.roblox.com/v1/users/${userId}/outfits?itemsPerPage=1000&pageNumber=1`, {
                method: 'GET',
                credentials: 'include'
            });
            const firstPageData = await firstPageResponse.json();
            totalPages = Math.ceil(firstPageData.total / 100);
            for (const outfit of firstPageData.data) {
                if (!uniqueOutfitIds.has(outfit.id)) {
                    uniqueOutfitIds.add(outfit.id);
                    allOutfits.push(outfit);
                }
            }
            for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
                const response = await fetch(`https://avatar.roblox.com/v1/users/${userId}/outfits?itemsPerPage=1000&pageNumber=${currentPage}`, {
                    method: 'GET',
                    credentials: 'include'
                });
                const data = await response.json();
                for (const outfit of data.data) {
                    if (!uniqueOutfitIds.has(outfit.id)) {
                        uniqueOutfitIds.add(outfit.id);
                        allOutfits.push(outfit);
                    }
                }
            }
            return allOutfits.filter(outfit => outfit.isEditable);
        } catch {
            return [];
        }
    };

    const fetchThumbnailUrls = async (outfitIds) => {
        if (outfitIds.length === 0) return {};
        const chunks = [];
        const chunkSize = 100;
        for (let i = 0; i < outfitIds.length; i += chunkSize) {
            chunks.push(outfitIds.slice(i, i + chunkSize));
        }
        const imageUrlMap = {};
        try {
            for (const chunk of chunks) {
                const idsParam = chunk.map(outfit => outfit.id).join(',');
                const response = await fetch(`https://thumbnails.roblox.com/v1/users/outfits?userOutfitIds=${idsParam}&size=420x420&format=png`, {
                    method: 'GET',
                    credentials: 'include'
                });
                const data = await response.json();
                data.data.forEach(item => {
                    imageUrlMap[item.targetId] = item.imageUrl;
                });
            }
            return imageUrlMap;
        } catch {
            return {};
        }
    };

    const retryThumbnailForOutfit = async (outfit, imgElement, maxRetries = 3, delayMs = 1000) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(`https://thumbnails.roblox.com/v1/users/outfits?userOutfitIds=${outfit.id}&size=420x420&format=png`, {
                    method: 'GET',
                    credentials: 'include'
                });
                const data = await response.json();
                if (data.data && data.data.length > 0 && data.data[0].imageUrl) {
                    const newUrl = data.data[0].imageUrl;
                    if (newUrl && newUrl !== 'https://devforum-uploads.s3.dualstack.us-east-2.amazonaws.com/uploads/original/4X/3/2/e/32e912a3cacdd4788a54ea733ae424571d7823a2.png') {
                        imgElement.src = newUrl;
                        return;
                    }
                }
            } catch {
            }
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    };

    const createOutfitModal = async () => {
        const modal = document.createElement('div');
        modal.style = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;`;
        const modalContent = document.createElement('div');
        modalContent.style = `background: #2d2d2d; padding: 20px; border-radius: 8px; max-width: 80%; max-height: 80vh; overflow-y: auto; position: relative; margin-top: 30px;`;
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style = `position: fixed; top: 20px; right: 20px; background: #ff4444; border: none; color: white; font-size: 24px; cursor: pointer; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 10000; box-shadow: 0 2px 5px rgba(0,0,0,0.3);`;
        closeBtn.onclick = () => modal.remove();
        const outfitIds = await fetchOutfitIds();
        if (outfitIds.length === 0) {
            modalContent.innerHTML = `<p style="color: white; text-align: center;">No outfits found.</p>`;
            modal.appendChild(closeBtn);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            return;
        }
        const imageUrlMap = await fetchThumbnailUrls(outfitIds);
        const grid = document.createElement('div');
        grid.style = `display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; justify-content: center;`;
        outfitIds.forEach(outfit => {
            const outfitCard = document.createElement('div');
            outfitCard.style = `background: #1f1f1f; padding: 10px; border-radius: 4px; text-align: center; color: white; position: relative;`;
            const detailsBtn = document.createElement('button');
            detailsBtn.innerHTML = '🛈';
            detailsBtn.style = `position: absolute; top: 5px; right: 5px; background: #4CAF50; border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; z-index: 1;`;
            detailsBtn.title = "View outfit details";
            detailsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showAssetDetails(outfit.id);
            });
            const img = document.createElement('img');
            img.src = imageUrlMap[outfit.id] || 'https://devforum-uploads.s3.dualstack.us-east-2.amazonaws.com/uploads/original/4X/3/2/e/32e912a3cacdd4788a54ea733ae424571d7823a2.png';
            img.style = 'width: 100%; border-radius: 4px;';
            img.onerror = () => retryThumbnailForOutfit(outfit, img);
            outfitCard.appendChild(img);
            const name = document.createElement('p');
            name.textContent = outfit.name || 'Untitled Outfit';
            name.style = 'margin: 10px 0 5px 0;';
            outfitCard.appendChild(name);
            outfitCard.appendChild(detailsBtn);
            grid.appendChild(outfitCard);
            if (img.src === 'https://devforum-uploads.s3.dualstack.us-east-2.amazonaws.com/uploads/original/4X/3/2/e/32e912a3cacdd4788a54ea733ae424571d7823a2.png') {
                retryThumbnailForOutfit(outfit, img);
            }
        });
        modalContent.appendChild(grid);
        modal.appendChild(closeBtn);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    };

    const showAssetDetails = async (outfitId) => {
        const modal = document.createElement('div');
        modal.style = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; justify-content: center; align-items: center;`;
        const modalContent = document.createElement('div');
        modalContent.style = `background: #2d2d2d; padding: 20px; border-radius: 8px; max-width: 80%; max-height: 80vh; overflow-y: auto; position: relative;`;
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style = `position: absolute; top: 10px; right: 10px; background: none; border: none; color: white; font-size: 24px; cursor: pointer;`;
        closeBtn.onclick = () => modal.remove();
        const loadingText = document.createElement('p');
        loadingText.textContent = 'Loading assets...';
        loadingText.style = 'color: white;';
        modalContent.appendChild(loadingText);
        modal.appendChild(modalContent);
        modalContent.appendChild(closeBtn);
        document.body.appendChild(modal);
        try {
            const response = await fetch(`https://avatar.roblox.com/v1/outfits/${outfitId}/details`, {
                method: 'GET',
                credentials: 'include'
            });
            modalContent.removeChild(loadingText);
            const data = await response.json();
            const assetsList = document.createElement('div');
            assetsList.style = 'color: white;';
            if (data.assets && data.assets.length > 0) {
                const title = document.createElement('h3');
                title.textContent = `Outfit Assets (${data.assets.length})`;
                title.style = 'margin-bottom: 15px;';
                assetsList.appendChild(title);
                data.assets.forEach(asset => {
                    const assetElement = document.createElement('div');
                    assetElement.style = 'margin-bottom: 10px;';
                    const link = document.createElement('a');
                    link.href = `https://www.roblox.com/catalog/${asset.id}/`;
                    link.target = '_blank';
                    link.textContent = `${asset.name} (${asset.assetType.name})`;
                    link.style = 'color: #00a8ff; text-decoration: none;';
                    assetElement.appendChild(link);
                    assetsList.appendChild(assetElement);
                });
            } else {
                assetsList.textContent = 'No assets found.';
            }
            modalContent.appendChild(assetsList);
        } catch {
            modalContent.removeChild(loadingText);
            modalContent.textContent = 'Error occurred upon loading.';
        }
    };

    setTimeout(addOutfitButton, 2000);
})();
