import { getQuestion } from "./api.js";
// 随机延迟执行函数
export const executeWithRandomDelay = (callback, ...args) => {
    return new Promise((resolve, reject) => {
        const delayTime = Math.random() * 10 + 1;

        setTimeout(() => {
            const result = callback(...args);
            resolve(result);
        }, delayTime * 1000);
    });
};
// 扁平化试题列表
export let topicListFlat = (topicList) => {
    let list = [];
    topicList.forEach((item) => {
        if (item.childList) {
            list.push(...topicListFlat(item.childList));
        } else {
            list.push(item);
        }
    });
    return list;
};

// 构造用于提交的试题答案
export let buildAnswers = async (topicData) => {
    let answers = [];
    // 未收入试题数量
    let count = 0;
    // 是否要提交试卷
    let isSubmit = true;
    for (let item of topicData) {
        let question = await getQuestion(item.questionTitle || item.id);
        let answer = {
            id: item.id,
            topicType: item.courseTopicTypeCode || item.questionTypeCode,
            answer: "",
            attachments: "",
        };
        // 没有保存过试题，处理逻辑
        if (!question) {
            count++;
            if (item.optionList) answer.answer = "0";
            // 单选
            if (item.courseTopicTypeCode == "single") answer.answer = "A";
            // 有主观题，不提交答案了
            if (item.courseTopicTypeCode == "subjective") isSubmit = false;
        } else {
            if (question.answer) answer.answer = question.answer;
            if (question.optionList) {
                let option = [];
                question.optionList.forEach((item, index) => {
                    if (item.isAnswer) option.push(index);
                });
                answer.answer = option.join(",");
            }
        }
        if (item.childList) {
            answer = { id: item.id };
            answer.childList = (await buildAnswers(item.childList)).answers;
        }
        answers.push(answer);
    }
    return { answers, count ,isSubmit};
};
