export class ActBase {
    static async loadHelper(imageSource) {
        const image = new Image();
        image.src = imageSource;
        await new Promise(resolv => image.onload = resolv);
        return image;
    }

    static loadHelper1(imageSource) {
        return new Promise(resolv => {
            const image = new Image();
            image.src = imageSource;
            image.onload = () => resolv(image);
        });
    }
}