import axios from "./axios.js";
import path from "path";
import { JsonDB, Config } from "node-json-db";
import {executeWithRandomDelay} from './util.js'
let db = new JsonDB(new Config("bank", true, true, "/"));
/**
 * 作业列表
  @params {Object} params
  @params {String} params.courseId 课程id
  @params {String} params.pageIndex 页码
*/
export let loadTopicListData = (params) => {
    return axios.post("https://www.learnin.com.cn/app/user/student/course/space/topic/appStudentCourseTopic/loadTopicListData", params);
};
/**
 * 习题列表
  @params {Object} params
  @params {String} params.courseId 课程id
  @params {String} params.topicId 作业id
*/
export let loadTopicData = (params) => {
    return axios.post("https://www.learnin.com.cn/app/user/student/course/space/topic/appStudentCourseTopic/loadTopicData", params);
};
/**
 * 重新答题
  @params {Object} params
  @params {String} params.courseId 课程id
  @params {String} params.topicId 作业id
*/
export let loadRedoTopicData = (params) => {
    return axios.post("https://www.learnin.com.cn/app/user/student/course/space/topic/appStudentCourseTopic/loadRedoTopicData", params);
};

/**
 * 提交答案
 * @params {Object} params
 * @params {String} params.courseId 课程id
 * @params {String} params.topicId 作业id
 * @params {Array} params.allChoiceTopics 试题答案
 * @params {String} params.allChoiceTopics.id
 * @params {String} params.allChoiceTopics.topicType
 * @params {String} params.allChoiceTopics.answer
 * @params {String} params.allChoiceTopics.attachments
 * @params {String} params.studentCardTopicId ?
 * @params {String} params.studentStoreTopicId ?
 */
export let saveOrSubmitTopicData = (params) => {
    return axios.post("https://www.learnin.com.cn/app/user/student/course/space/topic/appStudentCourseTopic/saveOrSubmitTopicData", params);
}

//查询试题
export let getQuestion = async (key) => {
    let addr = `/questions/${key}`;
    if (await db.exists(addr)) return db.getData(addr);
    return null;
};

// 保存试题
export let saveQuestion = (params) => {
    return db.push(`/questions/${params.questionTitle||params.id}`, params);
};
