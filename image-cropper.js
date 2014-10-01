var dom = require('dom-events')

  , makeDraggable = require('./lib/draggable')
  , ensureElement = require('./lib/ensure-element')
  , getCropData = require('./lib/get-crop-data')
  , loadImages = require('./lib/load-images')
  , moveImage = require('./lib/move-image')
  , navigation = require('./lib/navigation')
  , resetZoom = require('./lib/reset-zoom')
  , setupElements = require('./lib/setup-elements')
  , setupResultImage = require('./lib/result-image')

  , init = function (containerElm, options, callback) {
      var navigationElm = ensureElement({ container: containerElm, className: 'navigation' })
        , croppedImage = new Image()
        , overlayImage = new Image()
        , images = [ croppedImage, overlayImage ]
        , width = options.width
        , height = options.height
        , maxZoom = options.maxZoom || 3
        , draggable = makeDraggable(overlayImage, function (event) {
            images.forEach(function (image) {
              moveImage(
                  image
                , event.movementX
                , event.movementY
                , options.width
                , options.height
              )
            })
          })
        , resultImage
        , enable = function (options) {
            var callback = options.callback || function () {}
              , sliderHandle = containerElm.querySelector('.navigation .slider .handle')
              , originalState = {
                    imageWidth: croppedImage.width
                  , imageHeight: croppedImage.height
                  , imageTop: croppedImage.style.top
                  , imageLeft: croppedImage.style.left
                  , sliderHandleLeft: sliderHandle.style.left
                }

            containerElm.classList.add('enabled')

            draggable.enable()

            if (resultImage) {
              resultImage.style.opacity = '0'
            }

            options.navigation.enable(function (err, data) {
              if (err) return callback(err)

              if (data && !data.save) {
                images.forEach(function (image) {
                  image.width = originalState.imageWidth
                  image.height = originalState.imageHeight
                  image.style.top = originalState.imageTop
                  image.style.left = originalState.imageLeft
                })
                sliderHandle.style.left = originalState.sliderHandleLeft
              }

              disable()
              callback(null, data)
            })
          }
        , disable = function () {
            if (resultImage) {
              resultImage.style.opacity = '1'
            }
            draggable.disable()
            containerElm.classList.remove('enabled')
          }

      if (options.resultSrc) {
        resultImage = setupResultImage({
            container: containerElm
          , src: options.resultSrc
          , width: options.width
          , height: options.height
        })
      }

      setupElements({
          containerElm: containerElm
        , croppedImage: croppedImage
        , overlayImage: overlayImage
        , navigation: navigationElm
        , width: width
        , height: height
      })

      loadImages(images, options.src, function (err) {
        if (err) return callback(err)

        // reset opacity, e.g. show the image
        images.forEach(function (image) { image.style.opacity = '' })

        // if we have cropData, use that. Otherwise start zoomed out and in center
        // (as defined in resetZom)
        if (options.cropData) {
          // TODO: move this to a separate module
          images.forEach(function (image) {
            var zoomFactor = image.naturalWidth / options.cropData.width
            image.style.top = - (options.cropData.top / zoomFactor) + 'px'
            image.style.left = - (options.cropData.left / zoomFactor) + 'px'
            image.width = options.cropData.width
            image.height = options.cropData.height
          })
        } else {
          images.forEach(function (image) {
            resetZoom(image, width, height)
          })
        }

        var nav = navigation({
                container: navigationElm
              , scaleFactor: croppedImage.width / croppedImage.naturalWidth
              , maxZoom: maxZoom
              , images: images
              , width: width
              , height: height
            })
          , results = {
              enable: function (callback) {
                enable({ navigation: nav, callback: callback })
              }

            , getCropData: function () {
                return getCropData({ image: croppedImage, container: containerElm })
              }
            , setResultImage: function (options) {
                resultImage = setupResultImage({
                    src: options.src
                  , container: containerElm
                  , width: width
                  , height: height
                })
              }
          }

        disable()

        callback(null, results)
      })
    }

module.exports = init
