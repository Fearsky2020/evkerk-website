import enhancedWorker from './worker-enhanced.js';
import { handleGroupRecommendation } from './group-recommendation.js';
import { handleWelcomePhotoJson } from './welcome-photo-json.js';

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const photoUpload=await handleWelcomePhotoJson(request,env,url);
    if(photoUpload)return photoUpload;
    const recommendation=await handleGroupRecommendation(request,env,url);
    if(recommendation)return recommendation;
    return enhancedWorker.fetch(request,env,ctx);
  },
  async scheduled(controller,env,ctx){
    return enhancedWorker.scheduled(controller,env,ctx);
  },
};
