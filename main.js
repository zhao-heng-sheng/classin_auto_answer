import { disciplines } from "./data.js";
import { topicListFlat, buildAnswers, executeWithRandomDelay } from "./util.js";
import { loadTopicListData, loadTopicData, loadRedoTopicData, saveOrSubmitTopicData, saveQuestion, getQuestion } from "./api.js";

let getTopicList = async (courseId) => {
    let limit = 10;
    let countPage = 1;
    let totalCount = 0;
    let topicList = [];
    try {
        let firstRes = await loadTopicListData({ courseId, pageIndex: 1 });
        topicList.push(...firstRes.topics);
        totalCount = firstRes.totalCount;
        countPage = Math.ceil(totalCount / limit);
        if (totalCount <= 0) return [];
        let res = await Promise.all([...Array(countPage - 1).keys()].map((i) => loadTopicListData({ courseId, pageIndex: i + 2 })));
        res.forEach((item) => {
            topicList.push(...item.topics);
        });
    } catch (error) {
        console.error('获取主题列表时出错:', error);
        return [];
    }
    // 筛选
    // topicMoldCode:   Normal平时  End期末
    // state: 11待提交 02已批阅
    let states = ["11", "02"];
    return topicList.filter((item) => item.topicMoldCode === "Normal" && states.includes(item.state));
};
let getTopicData = async (courseId, topicId) => {
    try {
        console.log(courseId, topicId,'123');
        let res = await loadTopicData({ courseId, topicId });
        console.log(res)
        let topic = res.topic;
        // 保存试题
        if (topic.state == "02") {
            let topicList = topicListFlat(topic.topicItems);
            for (let item of topicList) {
                try {
                    let question = await getQuestion(item.questionTitle || item.id);
                    if (!question) {
                        saveQuestion({ ...item, courseId, topicId });
                    }
                } catch (error) {
                    console.error('获取或保存试题时出错:', error);
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
    } catch (error) {
        console.error('获取主题数据时出错:', error);
        throw error;
    }
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
    await randomDelay();
    ({ topicData, studentStoreTopicId, studentCardTopicId } = await getTopicData(courseId, topicId));
    let res = await loadRedoTopicData({ courseId, topicId });
    studentStoreTopicId = res.topic.studentStoreTopicId;
    studentCardTopicId = res.topic.studentCardTopicId;
    if (res.topic.topicItems) topicData = res.topic.topicItems;
    await submitAnswer(topicData, courseId, topicId, studentStoreTopicId, studentCardTopicId);
};
(async () => {
    try {
        for (let discipline of disciplines) {
            let topicList = await getTopicList(discipline.id);
            for (let topic of topicList) {
                if (topic.topicScore && topic.topicScore > 80) continue;
                await randomDelay();
                let { topicData, submitType, studentStoreTopicId, studentCardTopicId } = await getTopicData(discipline.id, topic.id);
                if (submitType == "1") {
                    await submitAnswer(topicData, discipline.id, topic.id, studentStoreTopicId, studentCardTopicId);
                }
                if (submitType == "2") {
                    await againSubmitAnswer(topicData, discipline.id, topic.id, studentStoreTopicId, studentCardTopicId);
                }
            }
        }
    } catch (error) {
        console.error('主流程执行出错:', error);
    }
})();

// axios 随机延时 3秒左右
function randomDelay() {
    return new Promise((resolve) => {
        setTimeout(resolve, Math.floor(Math.random() * 3000) + 3000); 
    })
}