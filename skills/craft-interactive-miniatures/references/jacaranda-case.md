# Jacaranda Days 案例与证据索引

## 目录

- [案例范围](#案例范围)
- [源码入口](#源码入口)
- [反馈与当前方案](#反馈与当前方案)
- [项目特定参数](#项目特定参数)
- [视觉证据](#视觉证据)
- [验证记录与边界](#验证记录与边界)
- [迁移注意](#迁移注意)

## 案例范围

这是以悉尼蓝花楹花季为主题的虚构街角微缩场景，不代表对某一真实历史房产的测绘。作品使用奶油色三层建筑、连续圆弧转角、精细铁艺阳台、紫色长椅、暖灯和前低后高的四棵树，配英文生活方式杂志式页面。

本 skill 依据创作对话中的需求与返工，以及仓库 revision 4 源码和检查记录提炼。固定源码快照为 [e261a4a](https://github.com/qianchencc/jacaranda/tree/e261a4a017ea5dd43ec1f7fa7eb1273b049f7759)。原始参考视频和用户问题截图没有随本 skill 重新上传；下面的模型图不能冒充参考视频画面。

## 源码入口

| 文件 | 值得复用的部分 |
| --- | --- |
| [architecture.js](https://github.com/qianchencc/jacaranda/blob/e261a4a017ea5dd43ec1f7fa7eb1273b049f7759/dist/architecture.js) | 连续轮廓、铁艺、真实入口与门轴；catchSurfaces、solidContact |
| [vegetation.js](https://github.com/qianchencc/jacaranda/blob/e261a4a017ea5dd43ec1f7fa7eb1273b049f7759/dist/vegetation.js) | limb、terminalFan、bloomSpray；真实 releaseSites；可见与阴影材质的共同变形 |
| [wind.js](https://github.com/qianchencc/jacaranda/blob/e261a4a017ea5dd43ec1f7fa7eb1273b049f7759/dist/wind.js) | CPU/GLSL 对应的连续形变、风速、阵风和法线采样 |
| [petals.js](https://github.com/qianchencc/jacaranda/blob/e261a4a017ea5dd43ec1f7fa7eb1273b049f7759/dist/petals.js) | 发射、阻力、承接、支撑高度、积落交接与非均匀密度 |
| [main.js](https://github.com/qianchencc/jacaranda/blob/e261a4a017ea5dd43ec1f7fa7eb1273b049f7759/dist/main.js) | 相机与 UI 协同、日夜、对象交互、可中断状态和暂停 |
| [street.js](https://github.com/qianchencc/jacaranda/blob/e261a4a017ea5dd43ec1f7fa7eb1273b049f7759/dist/street.js) | 铺地、长椅、灯具和已有地面积花 |
| [README.md](https://github.com/qianchencc/jacaranda/blob/e261a4a017ea5dd43ec1f7fa7eb1273b049f7759/README.md) | 运行方式、体验范围、版本检查和资产说明 |

## 反馈与当前方案

按实际问题归纳三层演进：

1. 从“主题成立”推进到参考中的建筑、镜头、氛围和对象交互关系。
2. 从“不容易看见落花”推进到更可读的投影尺寸和分布，但暴露了独立粒子与静止树木的割裂。
3. 根据空屋顶与不合理飘落的反馈，连接树木风动、真实释放点、建筑承接及持续积落；再依据离线图将过均匀的屋顶撒点改成有留白的片区。

较早版本使用前景粒子和反射飞行走廊。它们是本次失败经验的来源，已被当前方案替代。

## 项目特定参数

下列数值用于解释这份源码，不是通用标准或性能承诺。

| 项目 | 当前案例设置 | 迁移时的判断 |
| --- | --- | --- |
| 植被结构 | 四株独立骨架与种子 | 按构图和空间重新设计 |
| 整体抬高 | 建筑、植被 Y 偏移 0.465 | 改用完整对象变换适配新场景 |
| 花瓣池容量 | 桌面 400、手机 280 | 容量不等于可见数量，实际测量再选 |
| 初始动态状态 | 约 16 秒确定性模拟预热 | 覆盖主要生命周期，避免首帧空场 |
| 昼夜切换 | 2.3 秒 | 按交互节奏及减少动态偏好调整 |
| 风动阴影更新 | 桌面约 5 Hz、手机约 3 Hz | 检查成本和可见延迟，不能只照抄频率 |
| 手机总览距离 | 特定视口为 81 或 106 | 由当前模型和 UI 可用画幅决定 |
| 依赖 | 本地 vendored Three.js r170 | 升级后重新核对 shader chunks |

初始积落按艺术化密度区域采样，实时落花使用简化风速、阻力和接触。模型提供的是因果连贯与视觉可信，不是完整空气动力学或长时自然堆积求解。

## 视觉证据

以下链接固定到同一源码快照。两张模型图使用同一抬高机位，在 17⅓ 秒与 19⅓ 秒导出实际生产几何和花瓣状态，再用 Blender CPU 渲染。

[平静时刻模型图](https://github.com/qianchencc/jacaranda/blob/e261a4a017ea5dd43ec1f7fa7eb1273b049f7759/docs/preview-wind-calm.png) · [阵风时刻模型图](https://github.com/qianchencc/jacaranda/blob/e261a4a017ea5dd43ec1f7fa7eb1273b049f7759/docs/preview-wind-gust.png)

对照树根、同一枝梢、屋顶空面、积花片区、雨棚和入口；不要仅比较紫色面积或截图是否漂亮。

[视觉证据 JSON](https://github.com/qianchencc/jacaranda/blob/e261a4a017ea5dd43ec1f7fa7eb1273b049f7759/docs/wind-visual-evidence.json) 保存了机位、时刻、源文件与图像哈希、变形标记及积落状态。两帧中的变化能证明导出几何发生运动，不能证明实时连续运动流畅。

[明信片界面图](https://github.com/qianchencc/jacaranda/blob/e261a4a017ea5dd43ec1f7fa7eb1273b049f7759/docs/preview-postcard.jpg) 和 [手机界面图](https://github.com/qianchencc/jacaranda/blob/e261a4a017ea5dd43ec1f7fa7eb1273b049f7759/docs/preview-mobile-interfaces.jpg) 属于 HTML 界面检查，不能用来证明 GPU 场景运行。

## 验证记录与边界

[verification-wind.json](https://github.com/qianchencc/jacaranda/blob/e261a4a017ea5dd43ec1f7fa7eb1273b049f7759/docs/verification-wind.json) 记录：

- 33 项应用交互检查，3 项无 WebGL 分支检查；DOM、时钟与 renderer 使用模拟替身。
- 桌面、手机各 10 项生命周期检查，分别覆盖 60 秒模拟；未发现检查范围内保留的立面穿透或非有限坐标。
- 886 个合格表面采样与实际网格射线核对，11 个实体接触案例。
- 根部、释放点、法线等数值检查，以及 18 个普通/深度/距离 shader 注入组合的源码检查。

这些数值描述已保存的历史检查记录。本次整理 skill 没有重新执行这套场景测试，也没有新增实机运行证据。

当时可用浏览器禁用了 WebGL，因而 GPU 驱动编译、实时外观、帧率和视觉流畅度未完成验证。Blender 光照与色调映射是近似；源码注入检查也不能替代 shader 真正编译。

旧 [verification-petals.json](https://github.com/qianchencc/jacaranda/blob/e261a4a017ea5dd43ec1f7fa7eb1273b049f7759/docs/verification-petals.json) 和 [petal-projection-evidence.json](https://github.com/qianchencc/jacaranda/blob/e261a4a017ea5dd43ec1f7fa7eb1273b049f7759/docs/petal-projection-evidence.json) 仅用于理解已被替代的粒子版本。

## 迁移注意

树的风场资料与各树的根位置、高度、柔度相互绑定；改变树形时同步调整。不同坐标变换、对象比例和视口都要重新检查。

将初始积落与动态发射的随机数流分开，可避免修改屋顶密度时同时改变所有后续释放样本。这是从本次迭代提炼的后续建议，当前工程仍共享这两个随机序列。

完整保留文档层级即可把 skill 用于新的樱花街角、秋叶庭院或类似微缩场景；本案例链接作为可选证据，不要求新场景依赖原仓库的绝对文件路径、项目身份或账号。
