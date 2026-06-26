// --- Private Helpers ---------------------------------------------------------

/**
 * Reads a File object and returns its contents as a base64 data URL string.
 * Wraps the browser's FileReader API in a Promise for async/await usage.
 *
 * @param {File} imageFile - The file to read from disk.
 * @returns {Promise<string>} Resolves with the data URL (e.g. "data:image/png;base64,...").
 */
function readFileAsDataUrl(imageFile) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()

    // Resolve with the base64 data URL once the file has been fully read.
    fileReader.onload = () => resolve(fileReader.result)

    // Reject with a human-readable error if the FileReader encounters a problem.
    fileReader.onerror = () => reject(new Error('The image could not be read.'))

    fileReader.readAsDataURL(imageFile)
  })
}

/**
 * Creates an HTMLImageElement from a data URL and waits for it to fully decode.
 * Needed so we can read the image's natural width/height before drawing to canvas.
 *
 * @param {string} dataUrl - A base64-encoded image data URL.
 * @returns {Promise<HTMLImageElement>} Resolves with the loaded image element.
 */
function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const imageElement = new Image()

    // Resolve once the browser has decoded the image and populated width/height.
    imageElement.onload = () => resolve(imageElement)

    // Reject if the data URL is malformed or the format is unsupported.
    imageElement.onerror = () => reject(new Error('The image could not be processed.'))

    imageElement.src = dataUrl
  })
}

// --- Public API ---------------------------------------------------------------

/**
 * Reads a File, validates its size, and returns a data URL for a version of the
 * image scaled down to fit within a 500x500 pixel bounding box.
 *
 * GIF files are returned as-is (no resize) because canvas round-tripping would
 * strip animation frames.
 *
 * @param {File} imageFile - The user-selected image file to process.
 * @returns {Promise<string>} A base64 data URL of the (possibly resized) image.
 * @throws {Error} If the file exceeds the 32 MB size limit.
 */
export async function createResizedImageDataUrl(imageFile) {
  // 32 MB expressed in bytes: 32 x 1024 x 1024 = 33,554,432
  const maxAllowedSizeInBytes = 33_554_432

  // Reject files that are too large before doing any further processing.
  if (imageFile.size > maxAllowedSizeInBytes) {
    throw new Error('Selected file is too big. Please choose a file under 32 MB.')
  }

  // GIFs cannot be resized via canvas without losing animation  -  return unchanged.
  if (imageFile.type === 'image/gif') {
    return readFileAsDataUrl(imageFile)
  }

  // Decode the file and load it into an image element so we can measure its dimensions.
  const originalDataUrl = await readFileAsDataUrl(imageFile)
  const loadedImage = await loadImageFromDataUrl(originalDataUrl)

  // Set up an off-screen canvas to draw the scaled image onto.
  const offscreenCanvas = document.createElement('canvas')
  const canvasContext = offscreenCanvas.getContext('2d')

  // Calculate the uniform scale factor needed to fit within the 500x500 bounding box.
  // The third argument (1) prevents upscaling images that are already smaller than the limit.
  const maxOutputWidth = 500
  const maxOutputHeight = 500
  const scaleFactor = Math.min(
    maxOutputWidth / loadedImage.width,
    maxOutputHeight / loadedImage.height,
    1, // never scale up; only scale down
  )

  // Apply the scale factor to determine the output canvas dimensions.
  offscreenCanvas.width = Math.round(loadedImage.width * scaleFactor)
  offscreenCanvas.height = Math.round(loadedImage.height * scaleFactor)

  // Draw the original image onto the canvas at the new, smaller size.
  canvasContext.drawImage(loadedImage, 0, 0, offscreenCanvas.width, offscreenCanvas.height)

  // Export the canvas contents as a data URL, preserving the original file type.
  return offscreenCanvas.toDataURL(imageFile.type || 'image/png')
}
