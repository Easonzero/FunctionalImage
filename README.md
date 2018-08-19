# FunctionalImage
an functional image process library accelerated by GPU

*FunctionImage*是一个支持通过函数式的方法操作图像和二维数组的库.

**WARN**:本项目仍处于开发中

## Demo

![Demo](./image/demo.png)

## Idea

图像本质上是一个元素为RGBA值的二维数组,图像处理可以视为将RGBA二维数组映射为新的RGBA二维数组的过程,这与函数式的思维不谋而合.

本项目将图像与浮点数二维数组视作为等同的操作对象及输出目标,提供一系列的函数式工具在\[图像,浮点数二维数组\]与\[图像,浮点数二维数组\]间建立映射,使得图像处理的代码能够使用函数式映射的方式,简洁清晰地完成目标需求.

此外,本项目也不仅限于单个图像与单个图像之间的映射,同时也试图实现一种多个图像与单个图像之间的映射,利用application函数式工具就可以实现这一目标.

最后,函数式的一个优势在于利于并行化加速,本项目底层实现基于gpu.js,利用WebGL对映射过程加速.

## Features

1. 支持fmap,bind,join,application,卷积函数.
2. 运算具有封闭性,即任意运算的结果可以作为任意运算的输入
3. 无限制的输入与输出,例如可以输入图像输出浮点数二维数组,输入浮点数二维数组输出图像等.
4. GPU加速
5. 支持动态变量
6. 支持Promise异步调用
7. 支持函数输入的形式可以为普通函数和箭头函数

## How to use

FunctionalImage的通常的使用流程是,通过`pure`函数将图像或者浮点数二维数组转化为可以进行操作的对象,然后链式调用FunctionalImage提供的操作函数,将输入映射为输出.
值得注意的是,FunctionalImage所有的操作都只会产生一些操作信息,并被缓存在container对象上,只有在执行`draw`函数或者`output`函数之后,才会被执行.`output`函数会返回一个Promise,可以通过`then`函数访问执行的结果.
此外,container对象可以通过调用get方法获取操作信息的缓存, 然后通过combine函数和其他的container合并, 对于任意参数为数据的操作函数,也可以传入container的操作信息缓存作为数据来源.
最后,操作函数的第二个参数可以指定输出类型,例如`N`代表输出为float二维数组,`RB`代表输出为RGBA二维数组,同时输入函数只对RB两个通道作用,GA两个通道的值为输入数据的原始值.

1. fmap

fmap是一个将单个元素映射为单个元素的函数.

```js
pure(image)
    .fmap(r=>g=>b=>a=>r,'N')
    .fmap(a=>1,'A')
    .draw()
```

2. bind

bind是一个将单个元素映射为矩阵的函数

```js
pure(image)
    .fmap(a=>a*a,'RGB')
    .bind(a=>x=>y=>a,'RGB',[2,2])
    .draw()
```

3. ap

ap是一个将多个元素映射为单个元素的函数

```js
pure(a=>b=>a*b,'RGB')
    .ap(image)
    .ap(data)//data是一个与图片等尺寸的float二维数组
    .draw()
```

4. convolute

```js
pure(image)
.convolute([
    [0.167,  0,0,0,0,0],
    [0,  0.167,0,0,0,0],
    [0,  0,0.167,0,0,0],
    [0,  0,0,0.167,0,0],
    [0,  0,0,0,0.167,0],
    [0,  0,0,0,0,0.167]
])
.draw()
```

5. join
join是一个将局部矩阵映射为单个元素的函数,r代表累积值,a代表某一通道值

```js
pure(image)
    .join(r=>a=>x=>y=>a,'RGB',[2,2])
    .draw()
```

