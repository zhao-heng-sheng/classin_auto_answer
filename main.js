import { disciplines } from "./data.js";
import { topicListFlat, buildAnswers, executeWithRandomDelay } from "./util.js";
import { loadTopicListData, loadTopicData, loadRedoTopicData, saveOrSubmitTopicData, saveQuestion, getQuestion } from "./api.js";

let getTopicList = async (courseId) => {
    let limit = 10;
    let countPage = 1;
    let totalCount = 0;
    let topicList = [];
    let firstRes = await loadTopicListData({ courseId, pageIndex: 1 });
    topicList.push(...firstRes.topics);
    totalCount = firstRes.totalCount;
    countPage = Math.ceil(totalCount / limit);
    if (totalCount <= 0) return [];
    let res = await Promise.all([...Array(countPage - 1).keys()].map((i) => loadTopicListData({ courseId, pageIndex: i + 2 })));
    res.forEach((item) => {
        topicList.push(...item.topics);
    });
    // 筛选
    // topicMoldCode:   Normal平时  End期末
    // state: 11待提交 02已批阅
    let states = ["11", "02"];
    return topicList.filter((item) => item.topicMoldCode === "Normal" && states.includes(item.state));
};
let getTopicData = async (courseId, topicId) => {
    // console.log(courseId, topicId);
    let { topic } = await loadTopicData({ courseId, topicId });
    // 保存试题
    if (topic.state == "02") {
        let topicList = topicListFlat(topic.topicItems);
        for (let item of topicList) {
            let question = await getQuestion(item.questionTitle || item.id);
            if (!question) {
                saveQuestion({ ...item, courseId, topicId });
            }
        }
    }
    // 1提交  2重做
    let submitType = topic.state == "11" ? "1" : topic.state == "02" && topic.topicScore < 80 ? "2" : "0";
    return {
        topicData: topic.topicItems,
        submitType,
        studentStoreTopicId: topic.studentStoreTopicId,
        studentCardTopicId: topic.studentCardTopicId,
    };
};

let submitAnswer = async (topicData, courseId, topicId, studentStoreTopicId, studentCardTopicId) => {
    let { answers, count, isSubmit } = await buildAnswers(topicData);
    if (!isSubmit) return console.log('不提交')
    let req = {
        courseId,
        topicId,
        submitTopic: true,
        allChoiceTopics: JSON.stringify(answers),
    };

    if (studentStoreTopicId) req.studentStoreTopicId = studentStoreTopicId;
    if (studentCardTopicId) req.studentCardTopicId = studentCardTopicId;
    console.log(req, "req");
    let res = await executeWithRandomDelay(saveOrSubmitTopicData, req);
    // let res = await saveOrSubmitTopicData(req);
    // console.log(res);
    if (res.responseCode != "SUCCESS") {
        // if(res.message=='非最新作业内容，提交失败') {
        //   againSubmitAnswer(topicData, courseId, topicId, studentStoreTopicId, studentCardTopicId)
        // }else {
        throw new Error(res.message);
        // }
    }
    //未录入题数大于1时，重新提交
    if (count > 1) {
        await againSubmitAnswer(topicData, courseId, topicId, studentStoreTopicId, studentCardTopicId);
    }
};
let againSubmitAnswer = async (topicData, courseId, topicId, studentStoreTopicId, studentCardTopicId) => {
    console.log("重做了");
    ({ topicData, studentStoreTopicId, studentCardTopicId } = await getTopicData(courseId, topicId));
    let res = await loadRedoTopicData({ courseId, topicId });
    studentStoreTopicId = res.topic.studentStoreTopicId;
    studentCardTopicId = res.topic.studentCardTopicId;
    if (res.topic.topicItems) topicData = res.topic.topicItems;
    await submitAnswer(topicData, courseId, topicId, studentStoreTopicId, studentCardTopicId);
};
(async () => {
    for (let discipline of disciplines) {
        let topicList = await getTopicList(discipline.id);
        for (let topic of topicList) {
            if (topic.topicScore && topic.topicScore > 80) continue;
            let { topicData, submitType, studentStoreTopicId, studentCardTopicId } = await getTopicData(discipline.id, topic.id);
            if (submitType == "1") {
                await submitAnswer(topicData, discipline.id, topic.id, studentStoreTopicId, studentCardTopicId);
            }
            if (submitType == "2") {
                await againSubmitAnswer(topicData, discipline.id, topic.id, studentStoreTopicId, studentCardTopicId);
            }
        }
    }
})();
