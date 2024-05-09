const PreviewInfoPost = require('../models/previewInfo');


class PreviewInfoRepository {

    /**
     * create preview info
     * 
     * @param {*} figureId 
     * @param {*} url 
     * @param {*} cheerioData 
     * @returns properties of preview info
     */
    static async createPreviewInfo(figureId, url, cheerioData) {
        const getMetaTag = (name) => {
            return ( cheerioData(`meta[name=${name}]`).attr("content") || cheerioData(`meta[propety="twitter${name}"]`).attr("content") || 
                cheerioData(`meta[property="og:${name}"]`).attr("content")
            );
        };

        var previewInfo = new PreviewInfoPost({
            url: url,
            title: cheerioData("title").first().text(),
            favicon: cheerioData('link[rel="shortcut icon"]').attr("href") || $('link[rel="alternate icon"]').attr("href"),
            description: getMetaTag("description"),
            image: getMetaTag("image"),
            author: getMetaTag("author"), 
            
            //since it store as figure_..., it store as string instead of new mongoose.Types.ObjectId(figure._id.replace('figure_', ''))
            figureId: figureId
        });
        await previewInfo.save();
        return previewInfo;
    }
  
    /** 
     * delete post with same figureId
     */
    static async deletePreviewInfoWithFigureId(id) {
        await PreviewInfoPost.deleteOne({figureId: id});
    }
  
  
    /**
     * copy preview information and save with new figure id
     */
    static async copyPreviewInfo(previousFigureId, newFigureId) {
        var post = await PreviewInfoPost.findOne({ figureId: previousFigureId});
        var newPreview = new PreviewInfoPost({
          url: post.url,
          title: post.title,
          favicon: post.favicon,
          description: post.description,
          image: post.image,
          author: post.author, 
          figureId: newFigureId
        });
        await newPreview.save()
    }
  }
  
  module.exports = PreviewInfoRepository;