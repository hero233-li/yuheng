import axios from'axios';
export const highFrequencyClient=axios.create({baseURL:'/api',timeout:15000});
highFrequencyClient.interceptors.request.use(config=>{const token=localStorage.getItem('alioth_token');if(token)config.headers.Authorization=`Bearer ${token}`;return config});
highFrequencyClient.interceptors.response.use(response=>response,error=>Promise.reject(new Error(error.response?.data?.message||error.message||'请求失败')));
